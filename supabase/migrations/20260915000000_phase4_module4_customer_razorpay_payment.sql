-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4 — MODULE 4: CUSTOMER RAZORPAY ONLINE PAYMENT (R4)
-- Date: 2026-09-15
-- Project: ODFE multi-tenant cafe POS (live project: bosgplvkuxtykfsnadcv)
--
-- PURPOSE
--   Enables customers to complete a Razorpay payment for an existing ODFE order
--   via a server-verified, atomic operation. The client calls POST
--   /api/payments/razorpay/complete after the Razorpay Checkout success callback.
--   The route handler independently verifies the payment against Razorpay's API,
--   writes a "verification ticket" row using the service_role client (bypassing
--   RLS), then calls this SECURITY DEFINER RPC with the authenticated user's JWT.
--   The RPC verifies the ticket, locks the order FOR UPDATE, inserts the payment,
--   and (if fully paid) sets the order to 'paid', frees the table, deducts
--   inventory, and earns loyalty points — all in a single transaction.
--
-- DESIGN
--   1) Verification ticket table (`razorpay_payment_verifications`):
--      Written ONLY by the server via createAdminClient() (service_role), which
--      bypasses RLS. The RPC is granted to 'authenticated' and derives
--      auth.uid() from the caller's JWT, but cannot write tickets directly
--      (no INSERT policy). This prevents a direct-RPC caller from inserting
--      arbitrary tickets and bypassing the Razorpay verification step.
--   2) Payment method uses existing 'card' (not a new 'razorpay' value):
--      The payments table has a CHECK constraint `method IN ('cash','card','upi','split')`.
--      Razorpay Checkout payments are card payments by nature. Using 'card' + the
--      Razorpay payment ID as reference avoids CHECK constraint violations and
--      keeps the existing payment-method UI consistent.
--   3) Idempotency: If the same `razorpay_payment_id` is submitted twice, the
--      second call detects the existing completed payment and returns success
--      without duplicating the payment row. If a different payment was used to
--      pay the order, the route rejects with 400 (order already paid).
--   4) Order is locked FOR UPDATE before remaining-calculation + payment insert,
--      serializing concurrent payments and making overpay impossible at the DB
--      level without any partial-unique index.
--   5) Reuses canonical `deduct_stock_for_order` and `earn_loyalty_points` RPCs
--      (both SECURITY DEFINER, both guarded by `app_current_cafe_id()`).
--   6) Stock movement note includes the Razorpay payment ID (pay_xxx) so the
--      idempotent guard inside `deduct_stock_for_order` skips on retry.
--
-- TABLE: razorpay_payment_verifications
--   Server-authored "verified ticket" rows. One per successful Razorpay payment.
--   UNIQUE on razorpay_payment_id (Razorpay enforces global uniqueness of payment IDs).
--
-- FUNCTION: complete_customer_razorpay_payment(p_order_id, p_razorpay_payment_id)
--   SECURITY DEFINER — runs with the function owner's privileges.
--   REVOKEd from PUBLIC and anon; GRANTed to authenticated only.
--   Derives caller identity via auth.uid() (customer profile lookup).
--   Returns one row: { order_id, order_number, payment_id, amount, status,
--                       fully_paid, paid_total, order_total }.
--
-- SAFETY
--   * No existing tables, columns, constraints, or RLS policies are modified.
--   * CREATE OR REPLACE + fixed grants → idempotent, safe to re-run.
--   * Runs inside the caller's transaction; any RAISE rolls back everything.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Verification ticket table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.razorpay_payment_verifications (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  razorpay_payment_id text NOT NULL,
  razorpay_order_id   text NOT NULL,
  order_id            uuid NOT NULL,
  cafe_id             uuid NOT NULL,
  customer_id         uuid NOT NULL,
  amount_paise        integer NOT NULL CHECK (amount_paise > 0),
  currency            text NOT NULL DEFAULT 'INR',
  status              text NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'completed')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS razorpay_payment_id_unique
  ON public.razorpay_payment_verifications (razorpay_payment_id);

-- RLS: No policies. Only service_role can insert (via createAdminClient).
-- authenticated users cannot write tickets directly.
ALTER TABLE public.razorpay_payment_verifications ENABLE ROW LEVEL SECURITY;

-- 2. RPC function ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_customer_razorpay_payment(
  p_order_id uuid,
  p_razorpay_payment_id text
)
RETURNS TABLE (
  order_id uuid,
  order_number text,
  payment_id uuid,
  amount numeric,
  status text,
  fully_paid boolean,
  paid_total numeric,
  order_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_profile_id uuid;
  v_auth_cafe_id uuid;
  v_customer_id uuid;
  v_order_cafe_id uuid;
  v_order_status text;
  v_order_total numeric;
  v_order_number text;
  v_table_id uuid;
  v_paid_before numeric := 0;
  v_paid_after numeric := 0;
  v_fully_paid boolean := false;
  v_payment_id uuid;
  v_ticket_cafe_id uuid;
  v_ticket_customer_id uuid;
BEGIN
  -- Caller identity from JWT
  v_auth_profile_id := auth.uid();

  IF v_auth_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Profile lookup (customer role, active, cafe assignment)
  SELECT p.cafe_id
    INTO v_auth_cafe_id
  FROM public.profiles p
  WHERE p.id = v_auth_profile_id
    AND p.role = 'customer'
    AND p.is_active = true;

  IF v_auth_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Customer access denied';
  END IF;

  -- Customer record
  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.profile_id = v_auth_profile_id
    AND c.cafe_id = v_auth_cafe_id;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer record not found';
  END IF;

  -- Verify ticket exists (inserted by route via service_role)
  SELECT rpv.cafe_id, rpv.customer_id
    INTO v_ticket_cafe_id, v_ticket_customer_id
  FROM public.razorpay_payment_verifications rpv
  WHERE rpv.razorpay_payment_id = p_razorpay_payment_id
    AND rpv.order_id = p_order_id
  LIMIT 1;

  IF v_ticket_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Payment verification ticket not found';
  END IF;

  IF v_ticket_cafe_id IS DISTINCT FROM v_auth_cafe_id THEN
    RAISE EXCEPTION 'Payment verification ticket not found';
  END IF;

  IF v_ticket_customer_id IS DISTINCT FROM v_customer_id THEN
    RAISE EXCEPTION 'Payment verification ticket not found';
  END IF;

  -- Lock the order FOR UPDATE
  SELECT o.cafe_id, o.status, o.total, o.order_number, o.table_id
    INTO v_order_cafe_id, v_order_status, v_order_total, v_order_number, v_table_id
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF v_order_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order_cafe_id IS DISTINCT FROM v_auth_cafe_id THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Ownership check
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id
      AND customer_id = v_customer_id
      AND cafe_id = v_auth_cafe_id
  ) THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Reject cancelled orders
  IF v_order_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot be paid';
  END IF;

  -- Idempotency: same razorpay_payment_id already completed for this order
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE order_id = p_order_id
      AND cafe_id = v_auth_cafe_id
      AND status = 'completed'
      AND reference = p_razorpay_payment_id
  ) THEN
    -- Already completed — return success without duplicating
    SELECT COALESCE(sum(p.amount), 0) INTO v_paid_before
    FROM public.payments p
    WHERE p.order_id = p_order_id
      AND p.cafe_id = v_auth_cafe_id
      AND p.status = 'completed';

    order_id := p_order_id;
    order_number := v_order_number;
    payment_id := NULL;
    amount := 0;
    status := 'completed';
    fully_paid := v_paid_before + 0.001 >= v_order_total;
    paid_total := v_paid_before;
    order_total := v_order_total;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Reject orders already fully paid by a DIFFERENT payment
  IF v_order_status = 'paid' THEN
    RAISE EXCEPTION 'Order is already paid';
  END IF;

  -- Compute remaining
  SELECT COALESCE(sum(p.amount), 0) INTO v_paid_before
  FROM public.payments p
  WHERE p.order_id = p_order_id
    AND p.cafe_id = v_auth_cafe_id
    AND p.status = 'completed';

  IF v_paid_before + 0.001 >= v_order_total THEN
    RAISE EXCEPTION 'Order is already paid';
  END IF;

  -- Insert the payment row (method='card' for Razorpay Checkout card payments)
  INSERT INTO public.payments (cafe_id, order_id, method, amount, reference, status, paid_at)
  VALUES (v_auth_cafe_id, p_order_id, 'card', v_order_total - v_paid_before, p_razorpay_payment_id, 'completed', now())
  RETURNING id INTO v_payment_id;

  v_paid_after := v_paid_before + (v_order_total - v_paid_before);
  v_fully_paid := v_paid_after + 0.001 >= v_order_total;

  IF v_fully_paid THEN
    -- Mark order as paid
    UPDATE public.orders
       SET status = 'paid', updated_at = now()
     WHERE id = p_order_id
       AND cafe_id = v_auth_cafe_id;

    -- Free the table (NO updated_at — confirmed not to exist on cafe_tables)
    IF v_table_id IS NOT NULL THEN
      UPDATE public.cafe_tables
         SET status = 'available'
       WHERE id = v_table_id
         AND cafe_id = v_auth_cafe_id;
    END IF;

    -- Deduct stock (idempotent; note includes Razorpay payment ID)
    PERFORM public.deduct_stock_for_order(p_order_id, v_auth_cafe_id, v_auth_profile_id);

    -- Earn loyalty points (single call per order: paid status blocks further payment)
    IF v_customer_id IS NOT NULL THEN
      PERFORM public.earn_loyalty_points(v_customer_id, v_auth_cafe_id, p_order_id, v_order_total, v_auth_profile_id);
    END IF;
  END IF;

  order_id := p_order_id;
  order_number := v_order_number;
  payment_id := v_payment_id;
  amount := v_order_total - v_paid_before;
  status := 'completed';
  fully_paid := v_fully_paid;
  paid_total := v_paid_after;
  order_total := v_order_total;
  RETURN NEXT;
END;
$$;

-- 3. Grants ───────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.complete_customer_razorpay_payment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_customer_razorpay_payment(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_customer_razorpay_payment(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.complete_customer_razorpay_payment(uuid, text) IS
  'Atomically complete a Razorpay payment for a customer order. Requires a server-written verification ticket. Inserts a payments row (method=card, reference=razorpay_payment_id), sets order to paid when fully settled, frees the table, deducts stock, and earns loyalty points. Idempotent for the same razorpay_payment_id. Rejects cancelled orders, wrong-cafe callers, and non-customer roles.';

-- ── Post-apply verification ──────────────────────────────────────────────────
-- -- 1) Table exists:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'razorpay_payment_verifications';
--
-- -- 2) Function exists, SECURITY DEFINER:
-- SELECT routines.routine_name,
--        pg_get_function_identity_arguments(routines.oid) AS args,
--        routines.security_type
-- FROM   information_schema.routines
-- WHERE  routine_schema = 'public'
--   AND  routine_name = 'complete_customer_razorpay_payment';
--
-- -- 3) Grants:
-- SELECT rp.grantee, rp.privilege_type
-- FROM   information_schema.routine_privileges rp
-- WHERE  rp.routine_schema = 'public'
--   AND  rp.routine_name = 'complete_customer_razorpay_payment'
--   AND  rp.grantee IN ('authenticated', 'anon', 'service_role', 'PUBLIC');

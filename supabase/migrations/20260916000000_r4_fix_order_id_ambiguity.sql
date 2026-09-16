-- ─────────────────────────────────────────────────────────────────────────────
-- R4 CORRECTIVE: Fix ambiguous `order_id` column reference in
-- complete_customer_razorpay_payment
-- Date: 2026-09-16
--
-- ROOT CAUSE
--   The RPC RETURNS TABLE includes output columns named `order_id` and `status`.
--   Inside the idempotency pre-check the subquery referenced the `payments`
--   columns WITHOUT a table alias:
--
--     IF EXISTS (
--       SELECT 1 FROM public.payments
--       WHERE order_id = p_order_id      -- 42702: ambiguous (output var vs column)
--         AND status = 'completed'       -- 42702: ambiguous (would fail next)
--         ...
--     )
--
--   PostgreSQL raises 42702 "column reference 'order_id' is ambiguous" because
--   the unqualified name matches both the RETURNS TABLE output variable and the
--   `payments.order_id` column.
--
-- FIX
--   Qualify every table column in the affected subqueries with a table alias.
--   No logic, privileges, or security behavior changes.
-- ─────────────────────────────────────────────────────────────────────────────

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
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id
      AND o.customer_id = v_customer_id
      AND o.cafe_id = v_auth_cafe_id
  ) THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Reject cancelled orders
  IF v_order_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot be paid';
  END IF;

  -- Idempotency: same razorpay_payment_id already completed for this order
  IF EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.order_id = p_order_id
      AND p.cafe_id = v_auth_cafe_id
      AND p.status = 'completed'
      AND p.reference = p_razorpay_payment_id
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

-- CREATE OR REPLACE preserves existing grants (REVOKE PUBLIC/anon,
-- GRANT TO authenticated) and the COMMENT from the original R4 migration.
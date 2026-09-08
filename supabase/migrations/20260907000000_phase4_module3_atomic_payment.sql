-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4 — MODULE 3: ATOMIC PAYMENT TRANSACTION
-- Date: 2026-09-07
-- Project: ODFE multi-tenant cafe POS (live project: bosgplvkuxtykfsnadcv)
--
-- PURPOSE
--   Replaces the client-side multi-step "collect payment" flow with ONE atomic
--   database RPC. The old flow (lib/orders/create-order.ts -> createPaymentForOrder)
--   inserts a payment row first, then separately updates order status, frees the
--   table, deducts inventory, and earns loyalty. If any later step fails the app
--   records a payment on an order that was never marked paid — a permanent
--   desync. This RPC completes the whole payment in a single transaction: any
--   failure rolls everything back.
--
-- LIVE-VERIFIED FACTS THIS FUNCTION RELIES ON (Read-Only audit of the live DB):
--   * payments: id, cafe_id, order_id, method (text), amount (numeric),
--     reference (nullable), status ('completed'/'refunded'), paid_at, created_at;
--     CHECKs: amount > 0, method IN ('cash','card','upi','split').
--   * orders: NO json totals column — subtotal / discount_total / tax_total /
--     total are numeric columns. Live statuses observed: sent_to_kitchen,
--     preparing, completed, paid, cancelled. The old client rejects paying
--     'paid' and 'cancelled' orders only.
--   * cafe_tables.status ('available' / 'occupied'); pos_sessions are open when
--     closed_at IS NULL. A table is freed ONLY when the order becomes fully paid.
--   * payment_methods has 0 rows on live — there is no DB-side method registry,
--     so the RPC validates the method against the same set the client uses.
--   * inventory_items has BOTH stock and current_stock; the canonical
--     deduct_stock_for_order decrements `stock` and is idempotent (guarded by
--     the 'Auto-deducted from order <id>' movement note). It also uses the
--     canonical helper current_cafe_id(), so it works when called from here.
--   * Orders flow sent_to_kitchen -> preparing -> completed -> paid (or
--     cancelled). advance_kitchen_ticket sets order status accordingly.
--
-- DESIGN DECISIONS
--   1) Single source of truth for "fully paid":
--        order.total == SUM(payments.amount WHERE status='completed')
--      The order row is locked FOR UPDATE before the payment is written. This
--      serializes concurrent payments for the same order and makes duplicate /
--      overpaying impossible at the DB level WITHOUT adding any partial-unique
--      index or constraint (none are live, none are added here).
--   2) Overpayments are rejected: amount + existing completed payments may not
--      exceed order.total. Multi-tender (split) flows remain supported as two
--      sequential RPC calls (e.g. 60/40) and the table is freed + stock deducted
--      + points earned only on the LAST call, when the order becomes fully paid.
--   3) Split method ('split') is explicitly rejected. The current client already
--      rejects it ('Split payments must be saved as cash, card, or UPI rows')
--      and no DB-side split support exists. This preserves the business rule.
--   4) Caller is resolved from auth.uid(); NO profile_id parameter exists, so an
--      attacker cannot pass an arbitrary created_by. Admin or cashier role is
--      required, matching create_order_with_kitchen_ticket.
--   5) The canonical inventory / loyalty RPCs are REUSED (deduct_stock_for_order,
--      earn_loyalty_points). No second implementation of those steps is added.
--   6) Opening/updating a POS session is NOT part of this RPC; sessions remain a
--      separate client concern (opening at login, closing at logout/end-of-day).
--   7) Refunds keep using the existing client refund flow; this RPC does not add
--      a second refund path.
--   8) The RPC is granted to 'authenticated' ONLY. Granting service_role is
--      deferred until Migration 3.4 decides whether the server-side API actually
--      calls it (browser clients call as 'authenticated').
--
-- SAFETY
--   * No tables, columns, constraints, indexes, or RLS policies are touched.
--   * CREATE OR REPLACE + fixed grants -> idempotent, safe to re-run.
--   * Runs inside the caller's transaction; any RAISE rolls the whole payment
--     back (including the payment insert, order status, table, inventory, and
--     loyalty writes).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_payment_for_order(
  p_order_id uuid,
  p_method text,
  p_amount numeric,
  p_reference text DEFAULT NULL
)
RETURNS TABLE (
  payment_id uuid,
  order_id uuid,
  status text,
  amount numeric,
  paid_total numeric,
  order_total numeric,
  fully_paid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_cafe_id uuid;
  v_auth_role text;
  v_order_cafe_id uuid;
  v_order_status text;
  v_order_total numeric;
  v_table_id uuid;
  v_table_cafe_id uuid;
  v_customer_id uuid;
  v_paid_before numeric := 0;
  v_paid_after numeric := 0;
  v_fully_paid boolean := false;
BEGIN
  IF p_order_id IS NULL OR p_method IS NULL OR p_amount IS NULL THEN
    RAISE EXCEPTION 'Invalid payment input';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF p_method NOT IN ('cash', 'card', 'upi') THEN
    IF p_method = 'split' THEN
      RAISE EXCEPTION 'Split payments must be saved as cash, card, or UPI payment rows';
    END IF;
    RAISE EXCEPTION 'Invalid payment method: %', p_method;
  END IF;

  IF p_method IN ('card', 'upi')
     AND (p_reference IS NULL OR trim(p_reference) = '') THEN
    RAISE EXCEPTION 'Card and UPI payments require a reference';
  END IF;

  SELECT p.cafe_id, p.role::text
    INTO v_auth_cafe_id, v_auth_role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true
  LIMIT 1;

  IF v_auth_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  IF v_auth_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'Admin or cashier access required';
  END IF;

  SELECT
    o.id,
    o.cafe_id,
    o.status,
    o.total,
    o.table_id,
    o.customer_id
  INTO
    payment_id,
    v_order_cafe_id,
    v_order_status,
    v_order_total,
    v_table_id,
    v_customer_id
  FROM public.orders AS o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF payment_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order_cafe_id IS DISTINCT FROM v_auth_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  IF v_order_status IN ('paid', 'cancelled') THEN
    RAISE EXCEPTION 'Order cannot be paid in its current status: %', v_order_status;
  END IF;

  SELECT COALESCE(sum(p.amount), 0)
    INTO v_paid_before
  FROM public.payments p
  WHERE p.order_id = p_order_id
    AND p.cafe_id = v_auth_cafe_id
    AND p.status = 'completed';

  IF v_paid_before + p_amount > v_order_total THEN
    RAISE EXCEPTION 'Payment of % exceeds the remaining balance of %',
      p_amount, round(v_order_total - v_paid_before, 2);
  END IF;

  INSERT INTO public.payments (cafe_id, order_id, method, amount, reference, status, paid_at)
  VALUES (v_auth_cafe_id, p_order_id, p_method, p_amount, nullif(trim(p_reference), ''), 'completed', now())
  RETURNING id INTO payment_id;

  v_paid_after := v_paid_before + p_amount;
  -- Epsilon matches the legacy client tolerance (paidTotal + 0.001 >= orderTotal).
  v_fully_paid := v_paid_after + 0.001 >= v_order_total;

  IF v_fully_paid THEN
    UPDATE public.orders
       SET status = 'paid', updated_at = now()
     WHERE id = p_order_id
       AND cafe_id = v_auth_cafe_id;

    IF v_table_id IS NOT NULL THEN
      SELECT cafe_id
        INTO v_table_cafe_id
      FROM public.cafe_tables
      WHERE id = v_table_id;

      IF v_table_cafe_id IS DISTINCT FROM v_auth_cafe_id THEN
        RAISE EXCEPTION 'Table does not belong to this cafe';
      END IF;

      UPDATE public.cafe_tables
        SET status = 'available'
       WHERE id = v_table_id;
    END IF;

    -- Canonical, idempotent inventory step; raises on insufficient stock and
    -- thereby rolls back the whole payment transaction.
    PERFORM public.deduct_stock_for_order(p_order_id, v_auth_cafe_id, auth.uid());

    -- Earn loyalty points for the fully-paid order (single call per order: the
    -- 'paid' status set above blocks any further payment on this order).
    IF v_customer_id IS NOT NULL THEN
      PERFORM public.earn_loyalty_points(v_customer_id, v_auth_cafe_id, p_order_id, v_order_total, auth.uid());
    END IF;
  END IF;

  order_id := p_order_id;
  status := 'completed';
  amount := p_amount;
  paid_total := v_paid_after;
  order_total := v_order_total;
  fully_paid := v_fully_paid;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_payment_for_order(uuid, text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_payment_for_order(uuid, text, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_payment_for_order(uuid, text, numeric, text) TO authenticated;

COMMENT ON FUNCTION public.complete_payment_for_order(uuid, text, numeric, text) IS
  'Atomically record one completed payment for an order and, when the order becomes fully paid, set its status to paid, free its table, deduct stock, and earn loyalty points. Rejects paid/cancelled orders, invalid methods (including split), card/UPI without a reference, wrong-cafe callers, non-POS roles, and any payment exceeding the remaining balance. Order row is locked first (concurrency-safe).';

-- ── Post-apply verification (run in Supabase SQL Editor) ────────────────────
-- -- 1) Function exists, runs as SECURITY DEFINER:
-- SELECT routines.routine_name,
--        pg_get_function_identity_arguments(routines.oid) AS args,
--        routines.security_type
-- FROM   information_schema.routines
-- WHERE  routine_schema = 'public'
--   AND  routine_name = 'complete_payment_for_order';
--
-- -- 2) Grants: exactly one privilege for 'authenticated' USER:
-- SELECT rp.grantee, rp.privilege_type
-- FROM   information_schema.routine_privileges rp
-- WHERE  rp.routine_schema = 'public'
--   AND  rp.routine_name = 'complete_payment_for_order'
--   AND  rp.grantee IN ('authenticated', 'anon', 'service_role', 'PUBLIC');
--
-- -- 3) Live smoke (read-only; real write happens on your next live test):
-- -- SELECT pg_get_functiondef('public.complete_payment_for_order(uuid, text, numeric, text)'::regprocedure);
--
-- Full behavioural verification suite lives in:
--   supabase/verification/migration_3.2_atomic_payment_tests.sql
-- (runs inside BEGIN/ROLLBACK; it never modifies live data).
-- ─────────────────────────────────────────────────────────────────────────────
-- R5.3 — WEBHOOK EVENTS TABLE + WEBHOOK COMPLETION RPC
-- Date: 2026-09-16
-- Project: ODFE multi-tenant cafe POS (live project: bosgplvkuxtykfsnadcv)
--
-- PURPOSE
--   Lay the database foundation for Razorpay webhook reconciliation (R5).
--   1) Creates an audit/dedup table (`razorpay_webhook_events`) for incoming
--      Razorpay webhook events. The unique constraint on `razorpay_event_id`
--      enforces idempotent event processing at the database level.
--   2) Creates a webhook-specific SECURITY DEFINER RPC
--      (`complete_razorpay_webhook_payment`) that mirrors R4's atomic
--      completion logic but derives identity from the trusted verification
--      ticket instead of `auth.uid()`, so it works for webhook calls where
--      no authenticated customer session exists.
--   3) Creates two internal SECURITY DEFINER helpers
--      (`webhook_deduct_stock_for_order`, `webhook_earn_loyalty_points`)
--      that replicate the canonical deduction/loyalty algorithms without the
--      `app_current_cafe_id()` auth guard, using identical idempotency notes
--      to guarantee cross-function idempotency with the canonical helpers.
--
-- DESIGN
--   EVENT DEDUP
--     UNIQUE on razorpay_event_id prevents duplicate processing. The webhook
--     route (R5.4) uses upsert with onConflict to safely absorb concurrent
--     deliveries; the DB rejects the duplicate.
--
--   IDEMPOTENCY (payment level)
--     Same razorpay_payment_id → same order: returns existing result, no
--     duplicate payment row. Mirrors R4's (order_id, reference) idempotency.
--
--   CROSS-ORDER PROTECTION (CASE D)
--     A single razorpay payment must not complete two different ODFE orders.
--     The RPC verifies the ticket.order_id matches p_order_id, and checks
--     that no completed payment with this reference exists on any OTHER order.
--
--   RACE SAFETY
--     Order row is locked FOR UPDATE before any mutation. The first caller
--     (browser or webhook) wins; the second sees idempotent state.
--
--   STOCK & LOYALTY
--     `deduct_stock_for_order` and `earn_loyalty_points` use
--     `app_current_cafe_id()` which reads `auth.uid()`. Service-role callers
--     (webhooks) have `auth.uid() = NULL`, so those canonical helpers would
--     raise "Cafe access denied". This migration creates dedicated variants
--     that use the same idempotency notes, ensuring cross-function
--     idempotency: if a canonical helper runs later, its note-based check
--     sees the existing movement and skips; if this variant runs first, it
--     also sees an existing movement on retry and skips. The canonical
--     helpers remain unchanged; R4 is untouched.
--
-- SAFETY
--   * No existing tables, columns, constraints, or RLS policies are modified.
--   * All functions use CREATE OR REPLACE → idempotent, safe to re-run.
--   * RLS on the new table has zero policies: server/service-role only.
--   * The existing R4 RPC `complete_customer_razorpay_payment` is NOT touched.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Webhook events table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  razorpay_event_id text NOT NULL,
  event_type        text NOT NULL,
  razorpay_payment_id text NULL,
  razorpay_order_id   text NULL,
  order_id          uuid NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  payload           jsonb NOT NULL,
  status            text NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  error_message     text NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz NULL
);

-- UNIQUE enforces dedup at DB level; no separate index needed on this column.
CREATE UNIQUE INDEX IF NOT EXISTS razorpay_webhook_events_event_id_unique
  ON public.razorpay_webhook_events (razorpay_event_id);

-- Useful for lookups when processing/reconciling by order.
CREATE INDEX IF NOT EXISTS razorpay_webhook_events_order_id_idx
  ON public.razorpay_webhook_events (order_id);

-- Useful for lookups by Razorpay payment ID.
CREATE INDEX IF NOT EXISTS razorpay_webhook_events_razorpay_payment_id_idx
  ON public.razorpay_webhook_events (razorpay_payment_id);

-- Useful for time-based audit queries / cleanup.
CREATE INDEX IF NOT EXISTS razorpay_webhook_events_created_at_idx
  ON public.razorpay_webhook_events (created_at);

-- RLS: enabled but no policies. Server/service-role only.
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

-- 2. Internal helper: webhook-safe stock deduction ───────────────────────────
-- Mirrors `deduct_stock_for_order` logic exactly but WITHOUT the
-- `app_current_cafe_id()` auth guard. Uses the same note contract so
-- cross-function idempotency is preserved.

CREATE OR REPLACE FUNCTION public.webhook_deduct_stock_for_order(
  p_order_id uuid,
  p_cafe_id uuid
)
RETURNS TABLE(skipped_product_ids uuid[], deducted_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_skipped uuid[] := '{}';
  v_count integer := 0;
  v_existing boolean;
  v_movement_note text := 'Auto-deducted from order ' || p_order_id::text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND cafe_id = p_cafe_id
  ) THEN
    RAISE EXCEPTION 'Order not found for cafe %', p_cafe_id;
  END IF;

  -- Idempotency: already deducted for this order?
  SELECT EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE cafe_id = p_cafe_id
      AND notes = v_movement_note
      AND movement_type = 'out'
    LIMIT 1
  ) INTO v_existing;

  IF v_existing THEN
    skipped_product_ids := '{}';
    deducted_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Products without recipes (tracked for visibility; not deducted).
  SELECT array_agg(DISTINCT oi.product_id)
  INTO v_skipped
  FROM public.order_items oi
  LEFT JOIN public.product_ingredients pi
    ON pi.product_id = oi.product_id AND pi.cafe_id = oi.cafe_id
  WHERE oi.order_id = p_order_id
    AND oi.cafe_id = p_cafe_id
    AND pi.id IS NULL;

  FOR v_item IN
    SELECT
      pi.inventory_item_id,
      SUM(pi.quantity * oi.quantity)::DECIMAL(10,3) AS total_qty
    FROM public.order_items oi
    JOIN public.product_ingredients pi
      ON pi.product_id = oi.product_id
     AND pi.cafe_id = oi.cafe_id
    WHERE oi.order_id = p_order_id
      AND oi.cafe_id = p_cafe_id
    GROUP BY pi.inventory_item_id
    ORDER BY pi.inventory_item_id
  LOOP
    IF (
      SELECT stock FROM public.inventory_items
      WHERE id = v_item.inventory_item_id AND cafe_id = p_cafe_id
      FOR UPDATE
    ) < v_item.total_qty THEN
      RAISE EXCEPTION 'Insufficient stock for item %: has %, needs %',
        v_item.inventory_item_id,
        (SELECT stock FROM public.inventory_items WHERE id = v_item.inventory_item_id AND cafe_id = p_cafe_id),
        v_item.total_qty;
    END IF;

    INSERT INTO public.stock_movements (cafe_id, inventory_item_id, quantity, movement_type, notes, is_wastage, created_by)
    VALUES (p_cafe_id, v_item.inventory_item_id, v_item.total_qty, 'out', v_movement_note, false, NULL);

    UPDATE public.inventory_items
    SET stock = stock - v_item.total_qty
    WHERE id = v_item.inventory_item_id AND cafe_id = p_cafe_id;

    v_count := v_count + 1;
  END LOOP;

  skipped_product_ids := COALESCE(v_skipped, '{}');
  deducted_count := v_count;
  RETURN NEXT;
END;
$$;

-- 3. Internal helper: webhook-safe loyalty points ─────────────────────────────
-- Mirrors `earn_loyalty_points` logic but WITHOUT the `app_current_cafe_id()`
-- auth guard. The caller's FOR UPDATE order lock + paid-status guard ensures
-- this runs at most once per order.

CREATE OR REPLACE FUNCTION public.webhook_earn_loyalty_points(
  p_customer_id uuid,
  p_cafe_id uuid,
  p_order_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_tier_id uuid;
BEGIN
  v_points := FLOOR(p_amount / 50)::INTEGER;
  IF v_points <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.customers
  SET
    loyalty_points = loyalty_points + v_points,
    total_points_earned = total_points_earned + v_points
  WHERE id = p_customer_id AND cafe_id = p_cafe_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found for cafe %', p_cafe_id;
  END IF;

  SELECT id INTO v_tier_id
  FROM public.loyalty_tiers
  WHERE cafe_id = p_cafe_id
    AND min_points <= (
      SELECT total_points_earned
      FROM public.customers
      WHERE id = p_customer_id AND cafe_id = p_cafe_id
    )
    AND is_active = true
  ORDER BY min_points DESC
  LIMIT 1;

  IF v_tier_id IS NOT NULL THEN
    UPDATE public.customers
    SET tier_id = v_tier_id
    WHERE id = p_customer_id AND cafe_id = p_cafe_id;
  END IF;

  INSERT INTO public.reward_redemptions (
    cafe_id, customer_id, order_id, reward_type, points_used, value, description
  )
  VALUES (
    p_cafe_id, p_customer_id, p_order_id, 'points', v_points, p_amount,
    'Points earned from order'
  );
END;
$$;

-- 4. Webhook completion RPC ──────────────────────────────────────────────────
-- SECURITY DEFINER. Derives identity from the verification ticket, NOT from
-- auth.uid(). Works for service-role (webhook) callers where auth.uid() is
-- NULL. Mirrors R4's atomic structure: lock order, insert payment, mark paid,
-- free table, deduct stock, earn loyalty — all in one transaction.

CREATE OR REPLACE FUNCTION public.complete_razorpay_webhook_payment(
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
  v_ticket_cafe_id uuid;
  v_ticket_customer_id uuid;
  v_ticket_order_id uuid;
  v_order_cafe_id uuid;
  v_order_customer_id uuid;
  v_order_status text;
  v_order_total numeric;
  v_order_number text;
  v_table_id uuid;
  v_paid_before numeric := 0;
  v_paid_after numeric := 0;
  v_fully_paid boolean := false;
  v_payment_id uuid;
BEGIN
  -- 1. Trusted ticket lookup (unique on razorpay_payment_id)
  SELECT rpv.cafe_id, rpv.customer_id, rpv.order_id
    INTO v_ticket_cafe_id, v_ticket_customer_id, v_ticket_order_id
  FROM public.razorpay_payment_verifications rpv
  WHERE rpv.razorpay_payment_id = p_razorpay_payment_id
  LIMIT 1;

  IF v_ticket_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Payment verification ticket not found';
  END IF;

  -- Ticket must reference exactly this order (CASE D: cross-order protection)
  IF v_ticket_order_id IS DISTINCT FROM p_order_id THEN
    RAISE EXCEPTION 'Payment verification ticket not found';
  END IF;

  -- 2. Lock the order FOR UPDATE and validate ownership chain
  SELECT o.cafe_id, o.status, o.total, o.order_number, o.table_id, o.customer_id
    INTO v_order_cafe_id, v_order_status, v_order_total, v_order_number, v_table_id, v_order_customer_id
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF v_order_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order_cafe_id IS DISTINCT FROM v_ticket_cafe_id THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_ticket_customer_id IS NOT NULL
     AND v_order_customer_id IS DISTINCT FROM v_ticket_customer_id THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 3. Reject cancelled orders
  IF v_order_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot be paid';
  END IF;

  -- 4. Idempotency (CASE A/C/E): same razorpay payment already completed for this order
  IF EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.order_id = p_order_id
      AND p.status = 'completed'
      AND p.reference = p_razorpay_payment_id
  ) THEN
    SELECT COALESCE(sum(p.amount), 0) INTO v_paid_before
    FROM public.payments p
    WHERE p.order_id = p_order_id
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

  -- 5. CASE D: same payment already applied to a DIFFERENT order globally
  IF EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.status = 'completed'
      AND p.reference = p_razorpay_payment_id
      AND p.order_id IS DISTINCT FROM p_order_id
  ) THEN
    RAISE EXCEPTION 'Payment already applied to another order';
  END IF;

  -- 6. Reject orders already fully paid by a different payment
  IF v_order_status = 'paid' THEN
    RAISE EXCEPTION 'Order is already paid';
  END IF;

  -- 7. Compute remaining (server-side from DB, never from request)
  SELECT COALESCE(sum(p.amount), 0) INTO v_paid_before
  FROM public.payments p
  WHERE p.order_id = p_order_id
    AND p.status = 'completed';

  IF v_paid_before + 0.001 >= v_order_total THEN
    RAISE EXCEPTION 'Order is already paid';
  END IF;

  -- 8. Insert the payment row (method='card', reference=razorpay payment id)
  INSERT INTO public.payments (cafe_id, order_id, method, amount, reference, status, paid_at)
  VALUES (v_order_cafe_id, p_order_id, 'card', v_order_total - v_paid_before, p_razorpay_payment_id, 'completed', now())
  RETURNING id INTO v_payment_id;

  v_paid_after := v_paid_before + (v_order_total - v_paid_before);
  v_fully_paid := v_paid_after + 0.001 >= v_order_total;

  IF v_fully_paid THEN
    -- Mark order as paid
    UPDATE public.orders
       SET status = 'paid', updated_at = now()
     WHERE id = p_order_id
       AND cafe_id = v_order_cafe_id;

    -- Free the table
    IF v_table_id IS NOT NULL THEN
      UPDATE public.cafe_tables
         SET status = 'available'
       WHERE id = v_table_id
         AND cafe_id = v_order_cafe_id;
    END IF;

    -- Deduct stock (idempotent via note contract)
    PERFORM public.webhook_deduct_stock_for_order(p_order_id, v_order_cafe_id);

    -- Earn loyalty points (single call: order locked + paid guard)
    IF v_ticket_customer_id IS NOT NULL THEN
      PERFORM public.webhook_earn_loyalty_points(
        v_ticket_customer_id, v_order_cafe_id, p_order_id, v_order_total
      );
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

-- 5. Grants ───────────────────────────────────────────────────────────────────

-- Main RPC: service_role only (webhook route uses createAdminClient).
REVOKE ALL ON FUNCTION public.complete_razorpay_webhook_payment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_razorpay_webhook_payment(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.complete_razorpay_webhook_payment(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_razorpay_webhook_payment(uuid, text) TO service_role;

-- Internal helpers: called only by SECURITY DEFINER functions; revoke public.
REVOKE ALL ON FUNCTION public.webhook_deduct_stock_for_order(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.webhook_earn_loyalty_points(uuid, uuid, uuid, numeric) FROM PUBLIC;

-- 6. Documentation ────────────────────────────────────────────────────────────

COMMENT ON TABLE public.razorpay_webhook_events IS
  'R5 audit/dedup table for Razorpay webhook events. UNIQUE on razorpay_event_id enforces idempotent processing. RLS enabled with zero policies — server/service-role only.';

COMMENT ON FUNCTION public.complete_razorpay_webhook_payment(uuid, text) IS
  'R5 webhook-specific atomic payment completion. Mirrors R4 logic but derives identity from the verification ticket (not auth.uid()). Inserts a payments row (method=card, reference=razorpay_payment_id), sets order to paid when fully settled, frees the table, deducts stock, and earns loyalty points. Idempotent for the same razorpay_payment_id on the same order. Rejects cancelled orders, wrong-cafe tickets, cross-order payment reuse, and already-paid orders.';

COMMENT ON FUNCTION public.webhook_deduct_stock_for_order(uuid, uuid) IS
  'Internal webhook helper. Idempotent stock deduction without the app_current_cafe_id() auth guard. Uses the same movement note as the canonical deduct_stock_for_order for cross-function idempotency.';

COMMENT ON FUNCTION public.webhook_earn_loyalty_points(uuid, uuid, uuid, numeric) IS
  'Internal webhook helper. Loyalty points award without the app_current_cafe_id() auth guard. Idempotency guaranteed by the caller''s FOR UPDATE order lock + paid-status guard.';

-- ── Post-apply verification ──────────────────────────────────────────────────
-- -- 1) Table exists, RLS enabled, zero policies:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables WHERE schemaname = 'public'
-- AND tablename = 'razorpay_webhook_events';
--
-- SELECT COUNT(*) AS policy_count FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'razorpay_webhook_events';
--
-- -- 2) Unique constraint on razorpay_event_id:
-- SELECT indexdef FROM pg_indexes
-- WHERE tablename = 'razorpay_webhook_events' AND indexdef LIKE '%unique%';
--
-- -- 3) RPC exists, SECURITY DEFINER:
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid), p.prosecdef AS secdef
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'complete_razorpay_webhook_payment',
--     'webhook_deduct_stock_for_order',
--     'webhook_earn_loyalty_points'
--   );
--
-- -- 4) R4 RPC unchanged:
-- SELECT pg_get_functiondef(oid)
-- FROM pg_proc
-- WHERE proname = 'complete_customer_razorpay_payment'
--   AND pronamespace = 'public'::regnamespace;

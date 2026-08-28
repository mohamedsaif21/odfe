-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY: RLS / SECURITY DEFINER Cross-Tenant Hardening (Phase 4 — Module 1)
-- ----------------------------------------------------------------------------
-- Goal: guarantee Cafe A can NEVER read/insert/update/delete Cafe B business
-- data, even when calling SECURITY DEFINER RPCs or writing to object storage.
--
-- Confirmed vulnerabilities this migration fixes:
--   1. SECURITY DEFINER RPCs accepted a caller-supplied p_cafe_id and never
--      verified the caller actually belongs to that cafe. This let any
--      authenticated user operate on another cafe's inventory, purchases,
--      loyalty, expenses, customers, and read P&L data. We now gate every one
--      of them with current_cafe_id() = p_cafe_id (mirrors dashboard_analytics
--      pattern used by get_dashboard_kpis etc.).
--   2. The product-images storage bucket had wide-open INSERT/UPDATE policies
--      for ANY authenticated user at ANY path (no cafe scoping) and no DELETE
--      policy. Path convention is <cafe_id>/products/<product_id>/...
--      We re-create INSERT/UPDATE scoped to the caller's own cafe folder and
--      add a cafe-scoped DELETE policy. Public SELECT is preserved (bucket is
--      public and product images are served to anonymous menu viewers).
--   3. Duplicate, semantically-identical RLS policies (cafe_scoped_all AND
--      business_ops_cafe_scoped_all) existed on every business-ops table.
--      We drop the redundant business_ops_cafe_scoped_all, keeping the single
--      cafe_scoped_all authority so future audits are unambiguous.
--
-- Idempotent: uses CREATE OR REPLACE and IF NOT EXISTS / DROP POLICY IF EXISTS.
-- Run this in the Supabase SQL Editor (after all prior migrations).
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Cafe-ownership guard on SECURITY DEFINER business-ops RPCs
-- ────────────────────────────────────────────────────────────────────────────
-- Every function below is re-created with an added first-step guard:
--     IF current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
--       RAISE EXCEPTION 'Cafe access denied';
--     END IF;
-- This mirrors the proven, safe guard already used by dashboard_analytics.sql.

-- 1a. Inventory adjustment (atomic, 6-param form used by the app).
CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
  p_item_id UUID,
  p_cafe_id UUID,
  p_adjustment DECIMAL,
  p_type TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stock DECIMAL;
  v_final_type TEXT;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT stock INTO v_new_stock
  FROM public.inventory_items
  WHERE id = p_item_id AND cafe_id = p_cafe_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found for cafe %', p_cafe_id;
  END IF;

  v_new_stock := v_new_stock + p_adjustment;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: current %, requested adjustment %', v_new_stock - p_adjustment, p_adjustment;
  END IF;

  UPDATE public.inventory_items
  SET stock = v_new_stock
  WHERE id = p_item_id AND cafe_id = p_cafe_id;

  IF p_type IS NOT NULL THEN
    v_final_type := p_type;
    INSERT INTO public.stock_movements (cafe_id, item_id, quantity, type, note, is_wastage, created_by)
    VALUES (p_cafe_id, p_item_id, ABS(p_adjustment), v_final_type, p_note, false, p_created_by);
  END IF;
END;
$$;

-- 1b. Idempotent stock deduction for an order.
CREATE OR REPLACE FUNCTION public.deduct_stock_for_order(
  p_order_id UUID,
  p_cafe_id UUID,
  p_profile_id UUID
)
RETURNS TABLE(skipped_product_ids UUID[], deducted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_skipped UUID[] := '{}';
  v_count INTEGER := 0;
  v_existing BOOLEAN;
  v_movement_note TEXT := 'Auto-deducted from order ' || p_order_id::TEXT;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND cafe_id = p_cafe_id
  ) THEN
    RAISE EXCEPTION 'Order not found for cafe %', p_cafe_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE cafe_id = p_cafe_id
      AND note = v_movement_note
      AND type = 'out'
    LIMIT 1
  ) INTO v_existing;

  IF v_existing THEN
    skipped_product_ids := '{}';
    deducted_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

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
      pi.item_id,
      SUM(pi.quantity * oi.quantity)::DECIMAL(10,3) AS total_qty
    FROM public.order_items oi
    JOIN public.product_ingredients pi
      ON pi.product_id = oi.product_id
     AND pi.cafe_id = oi.cafe_id
    WHERE oi.order_id = p_order_id
      AND oi.cafe_id = p_cafe_id
    GROUP BY pi.item_id
    ORDER BY pi.item_id
  LOOP
    IF (
      SELECT stock FROM public.inventory_items
      WHERE id = v_item.item_id AND cafe_id = p_cafe_id
      FOR UPDATE
    ) < v_item.total_qty THEN
      RAISE EXCEPTION 'Insufficient stock for item %: has %, needs %',
        v_item.item_id,
        (SELECT stock FROM public.inventory_items WHERE id = v_item.item_id AND cafe_id = p_cafe_id),
        v_item.total_qty;
    END IF;

    INSERT INTO public.stock_movements (cafe_id, item_id, quantity, type, note, is_wastage, created_by)
    VALUES (p_cafe_id, v_item.item_id, v_item.total_qty, 'out', v_movement_note, false, p_profile_id);

    UPDATE public.inventory_items
    SET stock = stock - v_item.total_qty
    WHERE id = v_item.item_id AND cafe_id = p_cafe_id;

    v_count := v_count + 1;
  END LOOP;

  skipped_product_ids := COALESCE(v_skipped, '{}');
  deducted_count := v_count;
  RETURN NEXT;
END;
$$;

-- 1c. Idempotent stock restoration for a cancelled/refunded order.
CREATE OR REPLACE FUNCTION public.restore_stock_for_order(
  p_order_id UUID,
  p_cafe_id UUID,
  p_profile_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement RECORD;
  v_deduction_note TEXT := 'Auto-deducted from order ' || p_order_id::TEXT;
  v_restore_note TEXT := 'Restored from order ' || p_order_id::TEXT;
  v_already_restored BOOLEAN;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND cafe_id = p_cafe_id
  ) THEN
    RAISE EXCEPTION 'Order not found for cafe %', p_cafe_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE cafe_id = p_cafe_id
      AND note = v_restore_note
      AND type = 'in'
    LIMIT 1
  ) INTO v_already_restored;

  IF v_already_restored THEN
    RETURN;
  END IF;

  FOR v_movement IN
    SELECT id, item_id, quantity
    FROM public.stock_movements
    WHERE cafe_id = p_cafe_id
      AND note = v_deduction_note
      AND type = 'out'
    ORDER BY item_id
  LOOP
    PERFORM 1 FROM public.inventory_items
    WHERE id = v_movement.item_id AND cafe_id = p_cafe_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE WARNING 'Inventory item % no longer exists, skipping restoration', v_movement.item_id;
      CONTINUE;
    END IF;

    INSERT INTO public.stock_movements (cafe_id, item_id, quantity, type, note, is_wastage, created_by)
    VALUES (p_cafe_id, v_movement.item_id, v_movement.quantity, 'in', v_restore_note, false, p_profile_id);

    UPDATE public.inventory_items
    SET stock = stock + v_movement.quantity
    WHERE id = v_movement.item_id AND cafe_id = p_cafe_id;
  END LOOP;
END;
$$;

-- 1d. PO number generator.
CREATE OR REPLACE FUNCTION public.generate_po_number(p_cafe_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(order_number, '^PO-', ''), '')::INTEGER),
    0
  ) + 1
  INTO next_num
  FROM public.purchase_orders
  WHERE cafe_id = p_cafe_id
    AND order_number ~ '^PO-[0-9]+$';

  RETURN 'PO-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

-- 1e. Receive a purchase order (updates inventory + stock movements).
CREATE OR REPLACE FUNCTION public.receive_purchase_order(
  p_order_id UUID,
  p_cafe_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.purchase_orders%ROWTYPE;
  v_item RECORD;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT * INTO v_order
  FROM public.purchase_orders
  WHERE id = p_order_id AND cafe_id = p_cafe_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found for cafe %', p_cafe_id;
  END IF;

  IF v_order.status = 'received' THEN
    RETURN;
  END IF;

  UPDATE public.purchase_orders
  SET status = 'received', received_at = COALESCE(received_at, now())
  WHERE id = p_order_id AND cafe_id = p_cafe_id;

  FOR v_item IN
    SELECT item_id, quantity
    FROM public.purchase_order_items
    WHERE purchase_order_id = p_order_id AND cafe_id = p_cafe_id
  LOOP
    UPDATE public.inventory_items
    SET stock = stock + v_item.quantity
    WHERE id = v_item.item_id AND cafe_id = p_cafe_id;

    INSERT INTO public.stock_movements (
      cafe_id, item_id, quantity, type, note, is_wastage, created_by
    )
    VALUES (
      p_cafe_id,
      v_item.item_id,
      v_item.quantity,
      'in',
      'Received from purchase order ' || COALESCE(v_order.order_number, p_order_id::TEXT),
      false,
      v_order.created_by
    );
  END LOOP;
END;
$$;

-- 1f. Earn loyalty points.
CREATE OR REPLACE FUNCTION public.earn_loyalty_points(
  p_customer_id UUID,
  p_cafe_id UUID,
  p_order_id UUID,
  p_amount DECIMAL,
  p_profile_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
  v_tier_id UUID;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

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
    cafe_id, customer_id, order_id, reward_type, points_used, value, description, created_by
  )
  VALUES (
    p_cafe_id, p_customer_id, p_order_id, 'points', v_points, p_amount,
    'Points earned from order', p_profile_id
  );
END;
$$;

-- 1g. Redeem loyalty points.
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_customer_id UUID,
  p_cafe_id UUID,
  p_points INTEGER,
  p_order_id UUID,
  p_profile_id UUID
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_points INTEGER;
  v_discount DECIMAL;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  IF p_points <= 0 THEN
    RAISE EXCEPTION 'Points must be greater than zero';
  END IF;

  SELECT loyalty_points INTO v_current_points
  FROM public.customers
  WHERE id = p_customer_id AND cafe_id = p_cafe_id
  FOR UPDATE;

  IF v_current_points IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF v_current_points < p_points THEN
    RAISE EXCEPTION 'Insufficient points. Available: %, requested: %', v_current_points, p_points;
  END IF;

  v_discount := p_points::DECIMAL;

  UPDATE public.customers
  SET loyalty_points = loyalty_points - p_points
  WHERE id = p_customer_id AND cafe_id = p_cafe_id;

  INSERT INTO public.reward_redemptions (
    cafe_id, customer_id, order_id, reward_type, points_used, value, description, created_by
  )
  VALUES (
    p_cafe_id, p_customer_id, p_order_id, 'points', p_points, v_discount,
    'Points redeemed for order discount', p_profile_id
  );

  RETURN v_discount;
END;
$$;

-- 1h. Apply birthday reward.
CREATE OR REPLACE FUNCTION public.apply_birthday_reward(
  p_customer_id UUID,
  p_cafe_id UUID,
  p_order_id UUID,
  p_profile_id UUID
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_birthday DATE;
  v_reward DECIMAL := 100;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT birthday INTO v_birthday
  FROM public.customers
  WHERE id = p_customer_id AND cafe_id = p_cafe_id;

  IF v_birthday IS NULL THEN
    RAISE EXCEPTION 'No birthday set for customer';
  END IF;

  IF EXTRACT(MONTH FROM v_birthday) != EXTRACT(MONTH FROM CURRENT_DATE)
     OR EXTRACT(DAY FROM v_birthday) != EXTRACT(DAY FROM CURRENT_DATE) THEN
    RAISE EXCEPTION 'Today is not your birthday';
  END IF;

  INSERT INTO public.reward_redemptions (
    cafe_id, customer_id, order_id, reward_type, points_used, value, description, created_by
  )
  VALUES (
    p_cafe_id, p_customer_id, p_order_id, 'birthday', 0, v_reward,
    'Birthday reward applied', p_profile_id
  );

  RETURN v_reward;
END;
$$;

-- 1i. Apply referral reward.
CREATE OR REPLACE FUNCTION public.apply_referral_reward(
  p_customer_id UUID,
  p_cafe_id UUID,
  p_referral_code TEXT,
  p_profile_id UUID
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_reward DECIMAL := 50;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT id INTO v_referrer_id
  FROM public.customers
  WHERE referral_code = p_referral_code
    AND cafe_id = p_cafe_id
    AND is_active = true;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  IF v_referrer_id = p_customer_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;

  UPDATE public.customers
  SET referred_by = v_referrer_id
  WHERE id = p_customer_id AND cafe_id = p_cafe_id;

  UPDATE public.customers
  SET wallet_balance = wallet_balance + v_reward
  WHERE id = v_referrer_id AND cafe_id = p_cafe_id;

  UPDATE public.referral_codes
  SET used_count = used_count + 1,
      reward_given = reward_given + v_reward
  WHERE cafe_id = p_cafe_id
    AND customer_id = v_referrer_id
    AND code = p_referral_code;

  INSERT INTO public.reward_redemptions (
    cafe_id, customer_id, order_id, reward_type, points_used, value, description, created_by
  )
  VALUES (
    p_cafe_id, v_referrer_id, NULL, 'referral', 0, v_reward,
    'Referral reward for referring a new customer', p_profile_id
  );

  INSERT INTO public.wallet_transactions (
    cafe_id, customer_id, amount, type, reference, description, created_by
  )
  VALUES (
    p_cafe_id, v_referrer_id, v_reward, 'credit', 'referral',
    CONCAT('Referral reward for code: ', p_referral_code), p_profile_id
  );

  RETURN v_reward;
END;
$$;

-- 1j. P&L (was a cross-cafe data leak — revenue + expenses for an arbitrary cafe).
CREATE OR REPLACE FUNCTION public.get_profit_loss(
  p_cafe_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_revenue DECIMAL,
  total_expenses DECIMAL,
  net_profit DECIMAL,
  expense_breakdown JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue DECIMAL;
  v_expenses DECIMAL;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT COALESCE(SUM(p.amount), 0) INTO v_revenue
  FROM public.payments p
  JOIN public.orders o
    ON o.id = p.order_id
   AND o.cafe_id = p.cafe_id
  WHERE p.cafe_id = p_cafe_id
    AND p.status = 'completed'
    AND p.paid_at::DATE >= p_start_date
    AND p.paid_at::DATE <= p_end_date;

  SELECT COALESCE(SUM(amount), 0) INTO v_expenses
  FROM public.expenses
  WHERE cafe_id = p_cafe_id
    AND expense_date >= p_start_date
    AND expense_date <= p_end_date;

  RETURN QUERY
  SELECT
    v_revenue AS total_revenue,
    v_expenses AS total_expenses,
    (v_revenue - v_expenses) AS net_profit,
    (
      SELECT COALESCE(
        json_agg(json_build_object('category', category, 'total', total) ORDER BY total DESC),
        '[]'::json
      )
      FROM (
        SELECT ec.name AS category, COALESCE(SUM(e.amount), 0) AS total
        FROM public.expenses e
        JOIN public.expense_categories ec
          ON ec.id = e.category_id
         AND ec.cafe_id = e.cafe_id
        WHERE e.cafe_id = p_cafe_id
          AND e.expense_date >= p_start_date
          AND e.expense_date <= p_end_date
        GROUP BY ec.name
      ) grouped_expenses
    ) AS expense_breakdown;
END;
$$;

-- 1k. Merge duplicate customers (fixed search_path + ownership guard).
CREATE OR REPLACE FUNCTION public.merge_customers(
  p_survivor_id UUID,
  p_merged_id UUID,
  p_cafe_id UUID
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _survivor public.customers%ROWTYPE;
  _merged public.customers%ROWTYPE;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT * INTO _survivor FROM public.customers WHERE id = p_survivor_id AND cafe_id = p_cafe_id FOR UPDATE;
  SELECT * INTO _merged FROM public.customers WHERE id = p_merged_id AND cafe_id = p_cafe_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'One or both customers not found'; END IF;

  UPDATE public.customers
  SET
    email          = COALESCE(_survivor.email, _merged.email),
    phone          = COALESCE(_survivor.phone, _merged.phone),
    address        = COALESCE(_survivor.address, _merged.address),
    birthday       = COALESCE(_survivor.birthday, _merged.birthday),
    loyalty_points = _survivor.loyalty_points + _merged.loyalty_points,
    visit_count    = _survivor.visit_count + _merged.visit_count,
    lifetime_spend = _survivor.lifetime_spend + _merged.lifetime_spend
  WHERE id = p_survivor_id AND cafe_id = p_cafe_id;

  UPDATE public.orders SET customer_id = p_survivor_id
  WHERE customer_id = p_merged_id AND cafe_id = p_cafe_id;
  DELETE FROM public.customers WHERE id = p_merged_id AND cafe_id = p_cafe_id;
  RETURN p_survivor_id;
END;
$$;

-- 1l. Refresh a customer's stats (fixed search_path + ownership guard).
CREATE OR REPLACE FUNCTION public.refresh_customer_stats(
  p_customer_id UUID,
  p_cafe_id UUID
)
RETURNS void
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stats RECORD;
BEGIN
  IF public.current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT COUNT(*)::integer AS visit_count, COALESCE(SUM(total), 0) AS lifetime_spend
  INTO _stats
  FROM public.orders
  WHERE customer_id = p_customer_id AND cafe_id = p_cafe_id AND status IN ('paid', 'completed');

  UPDATE public.customers
  SET visit_count = _stats.visit_count, lifetime_spend = _stats.lifetime_spend
  WHERE id = p_customer_id AND cafe_id = p_cafe_id;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Cafe-scoped object storage policies for the product-images bucket
-- ────────────────────────────────────────────────────────────────────────────
-- Drop the wide-open authenticated INSERT/UPDATE policies from seed.sql and
-- re-create them scoped to the caller's own cafe folder (<cafe_id>/...).
-- Also add the missing cafe-scoped DELETE policy.
-- The public SELECT policy is intentionally preserved (public bucket).

DROP POLICY IF EXISTS "product_images_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_delete" ON storage.objects;

DROP POLICY IF EXISTS "product_images_authenticated_insert_cafe" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_update_cafe" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_delete_cafe" ON storage.objects;

-- Only allow writes into the caller's own cafe folder.
CREATE POLICY "product_images_authenticated_insert_cafe" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.current_cafe_id()::text
  );

CREATE POLICY "product_images_authenticated_update_cafe" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.current_cafe_id()::text
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.current_cafe_id()::text
  );

-- Enable deletes only within the caller's own cafe folder.
CREATE POLICY "product_images_authenticated_delete_cafe" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.current_cafe_id()::text
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Consolidate duplicate business-ops RLS policies
-- ────────────────────────────────────────────────────────────────────────────
-- Every business-ops table already has the authoritative cafe_scoped_all
-- (FOR ALL, cafe_id = auth_cafe_id()). The multi-tenant migration additionally
-- created an identical business_ops_cafe_scoped_all. Drop the redundant ones to
-- leave a single, unambiguous policy per table.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'inventory_items', 'stock_movements', 'product_ingredients', 'suppliers',
      'purchase_orders', 'purchase_order_items', 'loyalty_tiers',
      'wallet_transactions', 'referral_codes', 'reward_redemptions',
      'expense_categories', 'expenses'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS business_ops_cafe_scoped_all ON public.%I', t);
  END LOOP;
END $$;

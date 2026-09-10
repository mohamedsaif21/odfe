-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 3.3 — CANONICAL CHAIN  0003/0005  INVENTORY + CUSTOMER + KITCHEN +
-- E2E RPCs
-- Date: 2026-09-10   Project: ODFE multi-tenant cafe POS
--
-- PURPOSE
--   Reproduces the SECURITY DEFINER business RPCs, the kitchen ticket
--   lifecycle RPC and the end-to-end journey helpers, all idempotent
--   (CREATE OR REPLACE).
--
-- SOURCED FROM security_rls_final_audit_fix.sql (canonical bodies) with
-- LIVE-VERIFIED fixes (Probed 2026-09-10):
--   * C1/H2: ownership guards use app_current_cafe_id() (the live function).
--     current_cafe_id() does not exist live.
--   * C3: product_ingredients.inventory_item_id (not pi.item_id) in
--     deduct_stock_for_order.
--   * H3: customers has NO is_active/visit_count/lifetime_spend/address/
--     birthday -> apply_referral_reward drops the is_active filter;
--     merge_customers no longer touches the missing columns;
--     refresh_customer_stats is an ownership-checked no-op;
--     apply_birthday_reward is excluded (depends on absent customers.birthday).
--   * purchase_order_items.item_id IS a live column (unchanged).
--
-- Module 3 (complete_payment_for_order) lives in its own migration file and
-- calls deduct_stock_for_order(uuid, uuid, uuid) and
-- earn_loyalty_points(uuid, uuid, uuid, numeric, uuid); both are defined
-- below with matching signatures/return types.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1a. Inventory adjustment (atomic, 6-param form used by the app) ─────────

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
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
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
    INSERT INTO public.stock_movements (cafe_id, inventory_item_id, quantity, movement_type, notes, is_wastage, created_by)
    VALUES (p_cafe_id, p_item_id, ABS(p_adjustment), v_final_type, p_note, false, p_created_by);
  END IF;
END;
$$;

-- ─── 1b. Idempotent stock deduction for an order (C3: pi.inventory_item_id) ──

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
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
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
    VALUES (p_cafe_id, v_item.inventory_item_id, v_item.total_qty, 'out', v_movement_note, false, p_profile_id);

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

-- ─── 1c. Idempotent stock restoration for a cancelled/refunded order ─────────

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
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
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
      AND notes = v_restore_note
      AND movement_type = 'in'
    LIMIT 1
  ) INTO v_already_restored;

  IF v_already_restored THEN
    RETURN;
  END IF;

  FOR v_movement IN
    SELECT id, inventory_item_id, quantity
    FROM public.stock_movements
    WHERE cafe_id = p_cafe_id
      AND notes = v_deduction_note
      AND movement_type = 'out'
    ORDER BY inventory_item_id
  LOOP
    PERFORM 1 FROM public.inventory_items
    WHERE id = v_movement.inventory_item_id AND cafe_id = p_cafe_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE WARNING 'Inventory item % no longer exists, skipping restoration', v_movement.inventory_item_id;
      CONTINUE;
    END IF;

    INSERT INTO public.stock_movements (cafe_id, inventory_item_id, quantity, movement_type, notes, is_wastage, created_by)
    VALUES (p_cafe_id, v_movement.inventory_item_id, v_movement.quantity, 'in', v_restore_note, false, p_profile_id);

    UPDATE public.inventory_items
    SET stock = stock + v_movement.quantity
    WHERE id = v_movement.inventory_item_id AND cafe_id = p_cafe_id;
  END LOOP;
END;
$$;

-- ─── 1d. PO number generator ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_po_number(p_cafe_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
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

-- ─── 1e. Receive a purchase order (updates inventory + stock movements) ──────

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
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
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
      cafe_id, inventory_item_id, quantity, movement_type, notes, is_wastage, created_by
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

-- ─── 1f. Earn loyalty points ─────────────────────────────────────────────────

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
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
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
    cafe_id, customer_id, order_id, reward_type, points_used, value, description
  )
  VALUES (
    p_cafe_id, p_customer_id, p_order_id, 'points', v_points, p_amount,
    'Points earned from order'
  );
END;
$$;

-- ─── 1g. Redeem loyalty points ───────────────────────────────────────────────

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
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
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
    cafe_id, customer_id, order_id, reward_type, points_used, value, description
  )
  VALUES (
    p_cafe_id, p_customer_id, p_order_id, 'points', p_points, v_discount,
    'Points redeemed for order discount'
  );

  RETURN v_discount;
END;
$$;

-- ─── 1h. Apply referral reward (H3: customers.is_active does not exist live) ─

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
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT id INTO v_referrer_id
  FROM public.customers
  WHERE referral_code = p_referral_code
    AND cafe_id = p_cafe_id;

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
    cafe_id, customer_id, order_id, reward_type, points_used, value, description
  )
  VALUES (
    p_cafe_id, v_referrer_id, NULL, 'referral', 0, v_reward,
    'Referral reward for referring a new customer'
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

-- ─── 1h-note. apply_birthday_reward is EXCLUDED ─────────────────────────────
-- The historical body reads customers.birthday, which is NOT present in the
-- live customers table (verified 2026-09-10). Defining it here would create a
-- function that always errors. Reinstate it only after customers.birthday is
-- intentionally added.

-- ─── 1i. P&L (ownership-guarded) ─────────────────────────────────────────────

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
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
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

-- ─── 1j. Merge duplicate customers (H3: only live customer columns) ──────────

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
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT * INTO _survivor FROM public.customers WHERE id = p_survivor_id AND cafe_id = p_cafe_id FOR UPDATE;
  SELECT * INTO _merged FROM public.customers WHERE id = p_merged_id AND cafe_id = p_cafe_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'One or both customers not found'; END IF;

  UPDATE public.customers
  SET
    email          = COALESCE(_survivor.email, _merged.email),
    phone          = COALESCE(_survivor.phone, _merged.phone),
    loyalty_points = _survivor.loyalty_points + _merged.loyalty_points
  WHERE id = p_survivor_id AND cafe_id = p_cafe_id;

  UPDATE public.orders SET customer_id = p_survivor_id
  WHERE customer_id = p_merged_id AND cafe_id = p_cafe_id;
  DELETE FROM public.customers WHERE id = p_merged_id AND cafe_id = p_cafe_id;
  RETURN p_survivor_id;
END;
$$;

-- ─── 1k. Refresh customer stats (H3: ownership-checked no-op) ────────────────

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
  v_exists BOOLEAN;
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.customers WHERE id = p_customer_id AND cafe_id = p_cafe_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Customer not found for cafe %', p_cafe_id;
  END IF;
  -- No-op after validation: customers.visit_count / customers.lifetime_spend
  -- are not present in the live schema (verified 2026-09-10), so there is
  -- nothing to persist. Kept to preserve the API contract.
END;
$$;

-- ─── 2. Kitchen ticket lifecycle ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.advance_kitchen_ticket(
  p_ticket_id UUID,
  p_order_id UUID,
  p_next_stage TEXT,
  p_previous_stage TEXT
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cafe_id UUID;
  v_current_stage TEXT;
  v_role TEXT;
BEGIN
  SELECT kt.cafe_id, kt.stage
    INTO v_cafe_id, v_current_stage
  FROM public.kitchen_tickets kt
  WHERE kt.id = p_ticket_id
    AND kt.order_id = p_order_id;

  IF v_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Kitchen ticket not found';
  END IF;

  SELECT p.role::text
    INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.cafe_id = v_cafe_id
    AND p.is_active = true
  LIMIT 1;

  IF v_role NOT IN ('admin', 'kitchen') THEN
    RAISE EXCEPTION 'Kitchen access required';
  END IF;

  IF v_current_stage <> p_previous_stage THEN
    RAISE EXCEPTION 'Kitchen ticket stage changed. Refresh and try again.';
  END IF;

  IF p_previous_stage = 'to_cook' AND p_next_stage = 'preparing' THEN
    UPDATE public.kitchen_tickets
    SET
      stage = 'preparing',
      preparing_at = COALESCE(preparing_at, now()),
      updated_at = now()
    WHERE id = p_ticket_id;

    UPDATE public.orders
    SET
      status = 'preparing',
      updated_at = now()
    WHERE id = p_order_id
      AND cafe_id = v_cafe_id;

    RETURN;
  END IF;

  IF p_previous_stage = 'preparing' AND p_next_stage = 'completed' THEN
    UPDATE public.kitchen_tickets
    SET
      stage = 'completed',
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
    WHERE id = p_ticket_id;

    UPDATE public.orders
    SET
      status = 'completed',
      updated_at = now()
    WHERE id = p_order_id
      AND cafe_id = v_cafe_id;

    RETURN;
  END IF;

  RAISE EXCEPTION 'Invalid kitchen ticket stage transition';
END;
$$;

-- ─── 3. E2E journey helpers (from e2e_journey_support.sql) ───────────────────

CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT trim(both '-' FROM regexp_replace(lower(coalesce(input, 'cafe')), '[^a-z0-9]+', '-', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.onboard_admin_owner(
  p_user_id UUID,
  p_cafe_name TEXT,
  p_full_name TEXT
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
  v_base_slug TEXT;
  v_slug TEXT;
  v_cafe_id UUID;
  v_employee_id UUID;
  v_counter INTEGER := 0;
BEGIN
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;

  v_base_slug := nullif(public.slugify(p_cafe_name), '');
  IF v_base_slug IS NULL THEN
    v_base_slug := 'cafe';
  END IF;
  v_slug := v_base_slug;

  WHILE EXISTS (SELECT 1 FROM public.cafes WHERE slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter::TEXT;
  END LOOP;

  INSERT INTO public.cafes (name, slug, owner_id)
  VALUES (p_cafe_name, v_slug, p_user_id)
  RETURNING id INTO v_cafe_id;

  INSERT INTO public.profiles (id, cafe_id, role, full_name, email, is_active)
  VALUES (p_user_id, v_cafe_id, 'admin', p_full_name, v_email, true)
  ON CONFLICT (id) DO UPDATE
    SET cafe_id = EXCLUDED.cafe_id,
        role = 'admin',
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        is_active = true;

  DELETE FROM public.employees
  WHERE profile_id = p_user_id
    AND cafe_id <> v_cafe_id;

  INSERT INTO public.employees (cafe_id, profile_id, role)
  VALUES (v_cafe_id, p_user_id, 'admin')
  RETURNING id INTO v_employee_id;

  INSERT INTO public.payment_methods (cafe_id, type, label, is_active)
  VALUES
    (v_cafe_id, 'cash', 'Cash', true),
    (v_cafe_id, 'card', 'Card', true),
    (v_cafe_id, 'upi', 'UPI', true),
    (v_cafe_id, 'split', 'Split', true);

  INSERT INTO public.settings (cafe_id, key, value)
  VALUES (v_cafe_id, 'self_order', '{"mode":"online_ordering"}'::jsonb)
  ON CONFLICT (cafe_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  RETURN jsonb_build_object(
    'cafe_id', v_cafe_id,
    'profile_id', p_user_id,
    'employee_id', v_employee_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_employee(
  p_admin_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT,
  p_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_cafe_id UUID;
  v_auth_id UUID;
  v_employee_id UUID;
BEGIN
  IF p_role NOT IN ('cashier', 'kitchen') THEN
    RAISE EXCEPTION 'Invalid employee role';
  END IF;

  SELECT cafe_id INTO v_cafe_id
  FROM public.profiles
  WHERE id = p_admin_id
    AND role = 'admin'
    AND is_active = true;

  IF v_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;

  INSERT INTO public.profiles (id, cafe_id, role, full_name, email, is_active)
  VALUES (v_auth_id, v_cafe_id, p_role, p_full_name, p_email, true)
  ON CONFLICT (id) DO UPDATE
    SET cafe_id = EXCLUDED.cafe_id,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        is_active = true;

  DELETE FROM public.employees
  WHERE profile_id = v_auth_id
    AND cafe_id <> v_cafe_id;

  INSERT INTO public.employees (cafe_id, profile_id, role, pin)
  VALUES (v_cafe_id, v_auth_id, p_role, p_pin)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_employee_id;

  IF v_employee_id IS NULL THEN
    SELECT id INTO v_employee_id
    FROM public.employees
    WHERE profile_id = v_auth_id
      AND cafe_id = v_cafe_id
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'auth_id', v_auth_id,
    'profile_id', v_auth_id,
    'employee_id', v_employee_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_public_self_order_token(
  p_token TEXT
)
RETURNS TABLE (
  cafe_id UUID,
  table_id UUID,
  table_label TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.cafe_id,
    ct.id AS table_id,
    ct.label AS table_label
  FROM public.self_order_tokens t
  JOIN public.cafe_tables ct
    ON ct.id = t.table_id
   AND ct.cafe_id = t.cafe_id
  WHERE t.token = p_token
    AND t.is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.create_order_with_kitchen_ticket(
  p_cafe_id UUID,
  p_table_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_employee_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_coupon_code TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'pos',
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  ticket_id UUID,
  subtotal NUMERIC,
  discount_total NUMERIC,
  tax_total NUMERIC,
  total NUMERIC
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_auth_cafe_id UUID;
  v_order_id UUID;
  v_ticket_id UUID;
  v_order_number TEXT;
  v_table_label TEXT;
  v_coupon_id UUID;
  v_coupon_discount_type TEXT;
  v_coupon_value NUMERIC;
  v_coupon_discount NUMERIC := 0;
BEGIN
  IF p_source NOT IN ('pos', 'self_order') THEN
    RAISE EXCEPTION 'Invalid order source';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  SELECT p.role::text, p.cafe_id
    INTO v_role, v_auth_cafe_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true
  LIMIT 1;

  IF v_auth_cafe_id IS NULL OR v_auth_cafe_id <> p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  IF p_source = 'pos' THEN
    IF v_role NOT IN ('admin', 'cashier') THEN
      RAISE EXCEPTION 'Admin or cashier access required';
    END IF;

    IF p_employee_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = p_employee_id
        AND e.cafe_id = p_cafe_id
    ) THEN
      RAISE EXCEPTION 'Valid employee is required';
    END IF;
  ELSE
    IF v_role <> 'customer' THEN
      RAISE EXCEPTION 'Customer access required';
    END IF;

    IF p_customer_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = p_customer_id
        AND c.cafe_id = p_cafe_id
        AND c.profile_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Valid customer is required';
    END IF;

    IF p_table_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.self_order_tokens t
      WHERE t.table_id = p_table_id
        AND t.cafe_id = p_cafe_id
        AND t.is_active = true
    ) THEN
      RAISE EXCEPTION 'Active QR table is required';
    END IF;
  END IF;

  IF p_table_id IS NOT NULL THEN
    SELECT ct.label
      INTO v_table_label
    FROM public.cafe_tables ct
    WHERE ct.id = p_table_id
      AND ct.cafe_id = p_cafe_id;

    IF v_table_label IS NULL THEN
      RAISE EXCEPTION 'Table not found';
    END IF;
  END IF;

  DROP TABLE IF EXISTS pg_temp.tmp_order_lines;

  CREATE TEMP TABLE tmp_order_lines (
    product_id UUID,
    product_name TEXT,
    unit_price NUMERIC,
    quantity INTEGER,
    discount NUMERIC,
    tax_rate NUMERIC,
    item_discount NUMERIC,
    taxable NUMERIC,
    tax_amount NUMERIC,
    line_total NUMERIC,
    notes TEXT
  ) ON COMMIT DROP;

  INSERT INTO tmp_order_lines (
    product_id,
    product_name,
    unit_price,
    quantity,
    discount,
    tax_rate,
    item_discount,
    taxable,
    tax_amount,
    line_total,
    notes
  )
  SELECT
    p.id,
    p.name,
    p.price,
    item.quantity,
    p.discount,
    p.tax_rate,
    round((p.price * item.quantity) * (p.discount / 100), 2),
    round((p.price * item.quantity) - ((p.price * item.quantity) * (p.discount / 100)), 2),
    round(((p.price * item.quantity) - ((p.price * item.quantity) * (p.discount / 100))) * (p.tax_rate / 100), 2),
    round(((p.price * item.quantity) - ((p.price * item.quantity) * (p.discount / 100))) * (1 + (p.tax_rate / 100)), 2),
    nullif(trim(item.notes), '')
  FROM jsonb_to_recordset(p_items) AS item(product_id UUID, quantity INTEGER, notes TEXT)
  JOIN public.products p
    ON p.id = item.product_id
   AND p.cafe_id = p_cafe_id
   AND p.is_available = true
  WHERE item.quantity > 0;

  IF NOT EXISTS (SELECT 1 FROM tmp_order_lines) THEN
    RAISE EXCEPTION 'No valid order items found';
  END IF;

  SELECT
    round(sum(unit_price * quantity), 2),
    round(sum(item_discount), 2),
    round(sum(tax_amount), 2),
    round(sum(line_total), 2)
  INTO subtotal, discount_total, tax_total, total
  FROM tmp_order_lines;

  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    SELECT c.id, c.discount_type::text, c.value
      INTO v_coupon_id, v_coupon_discount_type, v_coupon_value
    FROM public.coupons c
    WHERE c.cafe_id = p_cafe_id
      AND c.code = upper(trim(p_coupon_code))
      AND c.is_active = true
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
      AND (c.min_order_amount IS NULL OR subtotal >= c.min_order_amount)
    LIMIT 1;

    IF v_coupon_id IS NULL THEN
      RAISE EXCEPTION 'Coupon is invalid, expired, fully used, or below minimum order amount';
    END IF;

    v_coupon_discount := CASE
      WHEN v_coupon_discount_type = 'percentage' THEN round(subtotal * (v_coupon_value / 100), 2)
      ELSE v_coupon_value
    END;
    v_coupon_discount := least(v_coupon_discount, subtotal - discount_total);
    discount_total := round(discount_total + v_coupon_discount, 2);
    total := round(greatest(total - v_coupon_discount, 0), 2);
  END IF;

  v_order_number := 'ODF-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad((floor(random() * 1000000))::integer::text, 6, '0');

  INSERT INTO public.orders (
    cafe_id,
    order_number,
    table_id,
    customer_id,
    employee_id,
    status,
    subtotal,
    discount_total,
    tax_total,
    total,
    coupon_code,
    notes,
    source,
    session_id
  )
  VALUES (
    p_cafe_id,
    v_order_number,
    p_table_id,
    p_customer_id,
    p_employee_id,
    'sent_to_kitchen',
    subtotal,
    discount_total,
    tax_total,
    total,
    nullif(upper(trim(p_coupon_code)), ''),
    nullif(trim(p_notes), ''),
    p_source,
    p_session_id
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    cafe_id,
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    discount,
    tax_rate,
    line_total,
    notes
  )
  SELECT
    p_cafe_id,
    v_order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    discount,
    tax_rate,
    line_total,
    notes
  FROM tmp_order_lines;

  INSERT INTO public.kitchen_tickets (
    cafe_id,
    order_id,
    order_number,
    table_label,
    stage,
    priority
  )
  VALUES (
    p_cafe_id,
    v_order_id,
    v_order_number,
    v_table_label,
    'to_cook',
    CASE WHEN p_source = 'self_order' THEN 1 ELSE 0 END
  )
  RETURNING id INTO v_ticket_id;

  INSERT INTO public.kitchen_ticket_items (
    cafe_id,
    ticket_id,
    product_name,
    quantity,
    notes
  )
  SELECT
    p_cafe_id,
    v_ticket_id,
    product_name,
    quantity,
    notes
  FROM tmp_order_lines;

  IF p_table_id IS NOT NULL THEN
    UPDATE public.cafe_tables
    SET status = 'occupied'
    WHERE id = p_table_id
      AND cafe_id = p_cafe_id;
  END IF;

  IF v_coupon_id IS NOT NULL THEN
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = v_coupon_id;
  END IF;

  order_id := v_order_id;
  order_number := v_order_number;
  ticket_id := v_ticket_id;
  RETURN NEXT;
END;
$$;
-- ════════════════════════════════════════════════════════════════════════════
-- Inventory Integrity Fixes
-- Addresses: idempotent deduction, stock restoration, atomic adjustments,
--            insufficient-stock validation, recipe-less product visibility.
-- Safe to run on current database — uses CREATE OR REPLACE, IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── A. Ensure stock_movements.note supports the idempotency pattern ──────
-- The note column already exists (TEXT, nullable). No schema change needed.
-- Idempotency is enforced by checking for an existing 'out' movement with
-- the canonical note pattern 'Auto-deducted from order <uuid>'.

-- ─── B. Atomic adjust_inventory_stock ─────────────────────────────────────
-- Replaces the previous version which only updated stock.
-- Now also inserts the stock_movement record atomically.
-- LOCK IN SHARE MODE prevents concurrent modifications during the read.

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
  -- Lock the inventory row to prevent concurrent reads
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

  -- Record movement only when caller provides type (backward-compatible)
  IF p_type IS NOT NULL THEN
    v_final_type := p_type;

    INSERT INTO public.stock_movements (cafe_id, item_id, quantity, type, note, is_wastage, created_by)
    VALUES (p_cafe_id, p_item_id, ABS(p_adjustment), v_final_type, p_note, false, p_created_by);
  END IF;
END;
$$;

-- ─── C. Idempotent deduct_stock_for_order ─────────────────────────────────
-- Returns structured data: { skipped_product_ids, deducted_count }
-- - Checks for existing deduction (idempotency)
-- - Validates sufficient stock (raises on deficit)
-- - Uses FOR UPDATE to prevent concurrent deductions
-- - Returns products without recipes as skipped

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
  -- Validate order belongs to this cafe
  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND cafe_id = p_cafe_id
  ) THEN
    RAISE EXCEPTION 'Order not found for cafe %', p_cafe_id;
  END IF;

  -- IDEMPOTENCY: if a deduction already exists, return immediately
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

  -- Identify products without recipes (for observability)
  SELECT array_agg(DISTINCT oi.product_id)
  INTO v_skipped
  FROM public.order_items oi
  LEFT JOIN public.product_ingredients pi
    ON pi.product_id = oi.product_id AND pi.cafe_id = oi.cafe_id
  WHERE oi.order_id = p_order_id
    AND oi.cafe_id = p_cafe_id
    AND pi.id IS NULL;

  -- Deduct stock for each ingredient, with row-level locking
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
    ORDER BY pi.item_id  -- Consistent lock ordering to prevent deadlocks
  LOOP
    -- Validate sufficient stock BEFORE deducting
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

    -- Record stock movement
    INSERT INTO public.stock_movements (cafe_id, item_id, quantity, type, note, is_wastage, created_by)
    VALUES (p_cafe_id, v_item.item_id, v_item.total_qty, 'out', v_movement_note, false, p_profile_id);

    -- Update stock (safe: we already validated sufficient stock above)
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

-- ─── D. Idempotent restore_stock_for_order ────────────────────────────────
-- Reverses automatic stock deductions for a cancelled or refunded order.
-- - Idempotent: checks for existing restoration before acting
-- - Uses canonical note pattern to find original deductions
-- - Creates reversal ('in') movements
-- - Uses FOR UPDATE to prevent concurrent restoration
-- - Validates cafe ownership

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
  -- Validate order belongs to this cafe
  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND cafe_id = p_cafe_id
  ) THEN
    RAISE EXCEPTION 'Order not found for cafe %', p_cafe_id;
  END IF;

  -- IDEMPOTENCY: if restoration already exists, return immediately
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

  -- Find original deductions and reverse each one
  FOR v_movement IN
    SELECT id, item_id, quantity
    FROM public.stock_movements
    WHERE cafe_id = p_cafe_id
      AND note = v_deduction_note
      AND type = 'out'
    ORDER BY item_id  -- Consistent lock ordering
  LOOP
    -- Lock inventory row before modifying
    PERFORM 1 FROM public.inventory_items
    WHERE id = v_movement.item_id AND cafe_id = p_cafe_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE WARNING 'Inventory item % no longer exists, skipping restoration', v_movement.item_id;
      CONTINUE;
    END IF;

    -- Create reversal movement
    INSERT INTO public.stock_movements (cafe_id, item_id, quantity, type, note, is_wastage, created_by)
    VALUES (p_cafe_id, v_movement.item_id, v_movement.quantity, 'in', v_restore_note, false, p_profile_id);

    -- Restore stock
    UPDATE public.inventory_items
    SET stock = stock + v_movement.quantity
    WHERE id = v_movement.item_id AND cafe_id = p_cafe_id;
  END LOOP;
END;
$$;

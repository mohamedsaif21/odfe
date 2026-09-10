-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 3.3 — CANONICAL CHAIN  0004/0005  DASHBOARD ANALYTICS
-- Date: 2026-09-10   Project: ODFE multi-tenant cafe POS
--
-- PURPOSE
--   Reproduces the dashboard analytics RPC layer and the performance indexes.
--   All functions already use the canonical ownership guard
--   app_current_cafe_id() (verified to exist live 2026-09-10).
--
-- LIVE-VERIFIED FIX (H3): get_customer_analytics previously read
--   customers.is_active / customers.visit_count / customers.lifetime_spend.
--   The live customers table has NONE of those columns (verified 2026-09-10);
--   running the historical body would fail at call time. Rebuilt to aggregate
--   repeat counts / spend from the orders table instead.
--
-- INDEXES: idx_customers_cafe_active (customers.is_active) and
--   idx_customers_cafe_spend (customers.lifetime_spend) reference columns that
--   do not exist live and are therefore omitted. Indexes already created by
--   0000/0002 are not re-created.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── A. Dashboard KPIs ─────────────────────────────────────────────────────
-- Returns: revenue, orders, avg_order_value, cancelled_orders, net_profit

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
  p_cafe_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  revenue DECIMAL,
  orders_count BIGINT,
  avg_order_value DECIMAL,
  cancelled_orders BIGINT,
  net_profit DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(p.amount), 0)::DECIMAL AS revenue,
    COUNT(o.id)::BIGINT AS orders_count,
    CASE WHEN COUNT(o.id) > 0
      THEN (COALESCE(SUM(p.amount), 0) / COUNT(o.id))::DECIMAL
      ELSE 0::DECIMAL
    END AS avg_order_value,
    COUNT(o.id) FILTER (WHERE o.status = 'cancelled')::BIGINT AS cancelled_orders,
    (COALESCE(SUM(p.amount), 0) - COALESCE(
      (SELECT SUM(e.amount) FROM expenses e WHERE e.cafe_id = p_cafe_id
        AND e.expense_date >= p_start_date AND e.expense_date <= p_end_date), 0
    ))::DECIMAL AS net_profit
  FROM orders o
  LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
  WHERE o.cafe_id = p_cafe_id
    AND o.created_at::DATE >= p_start_date
    AND o.created_at::DATE <= p_end_date;
END;
$$;

-- ─── B. Sales Trend ────────────────────────────────────────────────────────
-- Returns daily revenue + order count for charting.
-- p_granularity: 'day', 'week', 'month'

CREATE OR REPLACE FUNCTION public.get_sales_trend(
  p_cafe_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_granularity TEXT DEFAULT 'day'
)
RETURNS TABLE (
  period_date DATE,
  revenue DECIMAL,
  orders_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trunc TEXT;
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  v_trunc := CASE p_granularity
    WHEN 'week' THEN 'week'
    WHEN 'month' THEN 'month'
    ELSE 'day'
  END;

  RETURN QUERY
  SELECT
    date_trunc(v_trunc, o.created_at)::DATE AS period_date,
    COALESCE(SUM(p.amount), 0)::DECIMAL AS revenue,
    COUNT(o.id)::BIGINT AS orders_count
  FROM orders o
  LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
  WHERE o.cafe_id = p_cafe_id
    AND o.created_at::DATE >= p_start_date
    AND o.created_at::DATE <= p_end_date
  GROUP BY date_trunc(v_trunc, o.created_at)
  ORDER BY period_date;
END;
$$;

-- ─── C. Top Products ───────────────────────────────────────────────────────
-- Returns top N products by revenue within date range.

CREATE OR REPLACE FUNCTION public.get_top_products(
  p_cafe_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  quantity_sold BIGINT,
  revenue DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  RETURN QUERY
  SELECT
    oi.product_id,
    oi.product_name,
    SUM(oi.quantity)::BIGINT AS quantity_sold,
    SUM(oi.line_total)::DECIMAL AS revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id AND o.cafe_id = oi.cafe_id
  WHERE oi.cafe_id = p_cafe_id
    AND o.created_at::DATE >= p_start_date
    AND o.created_at::DATE <= p_end_date
    AND o.status != 'cancelled'
  GROUP BY oi.product_id, oi.product_name
  ORDER BY revenue DESC
  LIMIT p_limit;
END;
$$;

-- ─── D. Category Sales ─────────────────────────────────────────────────────
-- Returns sales breakdown by product category.

CREATE OR REPLACE FUNCTION public.get_category_sales(
  p_cafe_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category_name TEXT,
  quantity_sold BIGINT,
  revenue DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(pc.name, 'Uncategorized') AS category_name,
    SUM(oi.quantity)::BIGINT AS quantity_sold,
    SUM(oi.line_total)::DECIMAL AS revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id AND o.cafe_id = oi.cafe_id
  LEFT JOIN products p ON p.id = oi.product_id AND p.cafe_id = oi.cafe_id
  LEFT JOIN product_categories pc ON pc.id = p.category_id AND pc.cafe_id = p.cafe_id
  WHERE oi.cafe_id = p_cafe_id
    AND o.created_at::DATE >= p_start_date
    AND o.created_at::DATE <= p_end_date
    AND o.status != 'cancelled'
  GROUP BY pc.name
  ORDER BY revenue DESC;
END;
$$;

-- ─── E. Customer Analytics (H3 FIXED) ─────────────────────────────────────
-- Returns: total customers, repeat customers, loyalty stats, tier distribution.
-- Rebuilt so all aggregates derive from the live customers/orders shape:
-- repeat_customers = customers with >1 non-cancelled order;
-- top_customers.lifetime_spend = SUM(orders.total).

CREATE OR REPLACE FUNCTION public.get_customer_analytics(
  p_cafe_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_total BIGINT;
  v_repeat BIGINT;
  v_top_customers JSON;
  v_tier_distribution JSON;
  v_total_earned BIGINT;
  v_total_redeemed BIGINT;
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM customers WHERE cafe_id = p_cafe_id;

  SELECT COUNT(*) INTO v_repeat
  FROM (
    SELECT customer_id
    FROM orders
    WHERE cafe_id = p_cafe_id
      AND customer_id IS NOT NULL
      AND status <> 'cancelled'
    GROUP BY customer_id
    HAVING COUNT(*) > 1
  ) repeated;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_top_customers
  FROM (
    SELECT
      c.name,
      COALESCE(SUM(o.total), 0)::DECIMAL AS lifetime_spend,
      COUNT(o.id)::BIGINT AS visit_count,
      c.loyalty_points
    FROM customers c
    LEFT JOIN orders o
      ON o.customer_id = c.id
     AND o.cafe_id = c.cafe_id
     AND o.status <> 'cancelled'
    WHERE c.cafe_id = p_cafe_id
    GROUP BY c.id, c.name, c.loyalty_points
    ORDER BY lifetime_spend DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_tier_distribution
  FROM (
    SELECT
      COALESCE(lt.name, 'No Tier') AS tier_name,
      COUNT(c.id)::BIGINT AS customer_count
    FROM customers c
    LEFT JOIN loyalty_tiers lt ON lt.id = c.tier_id AND lt.cafe_id = c.cafe_id
    WHERE c.cafe_id = p_cafe_id
    GROUP BY lt.name
    ORDER BY customer_count DESC
  ) t;

  SELECT
    COALESCE(SUM(c.total_points_earned), 0)::BIGINT,
    COALESCE(SUM(c.total_points_earned - c.loyalty_points), 0)::BIGINT
  INTO v_total_earned, v_total_redeemed
  FROM customers c
  WHERE c.cafe_id = p_cafe_id;

  v_result := json_build_object(
    'total_customers', v_total,
    'repeat_customers', v_repeat,
    'top_customers', v_top_customers,
    'tier_distribution', v_tier_distribution,
    'total_points_earned', v_total_earned,
    'total_points_redeemed', v_total_redeemed
  );

  RETURN v_result;
END;
$$;

-- ─── F. Inventory Summary ──────────────────────────────────────────────────
-- Returns: total items, low stock, out of stock, inventory value, recent movements.

CREATE OR REPLACE FUNCTION public.get_inventory_summary(
  p_cafe_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_total_items BIGINT;
  v_low_stock BIGINT;
  v_out_of_stock BIGINT;
  v_inventory_value DECIMAL;
  v_recent_movements JSON;
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE is_active = true),
    COUNT(*) FILTER (WHERE is_active = true AND stock > 0 AND stock <= minimum_stock),
    COUNT(*) FILTER (WHERE is_active = true AND stock <= 0)
  INTO v_total_items, v_low_stock, v_out_of_stock
  FROM inventory_items WHERE cafe_id = p_cafe_id;

  SELECT COALESCE(SUM(stock * cost_per_unit), 0)::DECIMAL
  INTO v_inventory_value
  FROM inventory_items WHERE cafe_id = p_cafe_id AND is_active = true;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_recent_movements
  FROM (
    SELECT sm.inventory_item_id, ii.name AS item_name, sm.quantity, sm.movement_type,
           sm.notes, sm.is_wastage, sm.created_at
    FROM stock_movements sm
    JOIN inventory_items ii ON ii.id = sm.inventory_item_id AND ii.cafe_id = sm.cafe_id
    WHERE sm.cafe_id = p_cafe_id
    ORDER BY sm.created_at DESC
    LIMIT 20
  ) t;

  v_result := json_build_object(
    'total_items', v_total_items,
    'low_stock', v_low_stock,
    'out_of_stock', v_out_of_stock,
    'inventory_value', v_inventory_value,
    'recent_movements', v_recent_movements
  );

  RETURN v_result;
END;
$$;

-- ─── G. Purchase Summary ───────────────────────────────────────────────────
-- Returns: total spend, status breakdown, supplier spend, purchase trend.

CREATE OR REPLACE FUNCTION public.get_purchase_summary(
  p_cafe_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_total_spend DECIMAL;
  v_status_breakdown JSON;
  v_supplier_spend JSON;
  v_purchase_trend JSON;
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT COALESCE(SUM(total_amount), 0)::DECIMAL INTO v_total_spend
  FROM purchase_orders
  WHERE cafe_id = p_cafe_id
    AND created_at::DATE >= p_start_date AND created_at::DATE <= p_end_date;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_status_breakdown
  FROM (
    SELECT status, COUNT(*)::BIGINT AS count, COALESCE(SUM(total_amount), 0)::DECIMAL AS total
    FROM purchase_orders
    WHERE cafe_id = p_cafe_id
      AND created_at::DATE >= p_start_date AND created_at::DATE <= p_end_date
    GROUP BY status
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_supplier_spend
  FROM (
    SELECT s.name AS supplier_name, COALESCE(SUM(po.total_amount), 0)::DECIMAL AS total
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id AND s.cafe_id = po.cafe_id
    WHERE po.cafe_id = p_cafe_id
      AND po.created_at::DATE >= p_start_date AND po.created_at::DATE <= p_end_date
    GROUP BY s.name
    ORDER BY total DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_purchase_trend
  FROM (
    SELECT date_trunc('day', created_at)::DATE AS period_date,
           COUNT(*)::BIGINT AS count,
           COALESCE(SUM(total_amount), 0)::DECIMAL AS total
    FROM purchase_orders
    WHERE cafe_id = p_cafe_id
      AND created_at::DATE >= p_start_date AND created_at::DATE <= p_end_date
    GROUP BY date_trunc('day', created_at)
    ORDER BY period_date
  ) t;

  v_result := json_build_object(
    'total_spend', v_total_spend,
    'status_breakdown', v_status_breakdown,
    'supplier_spend', v_supplier_spend,
    'purchase_trend', v_purchase_trend
  );

  RETURN v_result;
END;
$$;

-- ─── H. Expense Summary ────────────────────────────────────────────────────
-- Returns expense breakdown by category + total expenses.
-- Note: reuses existing get_profit_loss for revenue/net profit.

CREATE OR REPLACE FUNCTION public.get_expense_summary(
  p_cafe_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_total_expenses DECIMAL;
  v_expense_categories JSON;
  v_expense_trend JSON;
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT COALESCE(SUM(amount), 0)::DECIMAL INTO v_total_expenses
  FROM expenses
  WHERE cafe_id = p_cafe_id
    AND expense_date >= p_start_date AND expense_date <= p_end_date;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_expense_categories
  FROM (
    SELECT ec.name AS category, COALESCE(SUM(e.amount), 0)::DECIMAL AS total
    FROM expenses e
    JOIN expense_categories ec ON ec.id = e.category_id AND ec.cafe_id = e.cafe_id
    WHERE e.cafe_id = p_cafe_id
      AND e.expense_date >= p_start_date AND e.expense_date <= p_end_date
    GROUP BY ec.name
    ORDER BY total DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_expense_trend
  FROM (
    SELECT expense_date AS period_date,
           COALESCE(SUM(amount), 0)::DECIMAL AS total
    FROM expenses
    WHERE cafe_id = p_cafe_id
      AND expense_date >= p_start_date AND expense_date <= p_end_date
    GROUP BY expense_date
    ORDER BY expense_date
  ) t;

  v_result := json_build_object(
    'total_expenses', v_total_expenses,
    'categories', v_expense_categories,
    'trend', v_expense_trend
  );

  RETURN v_result;
END;
$$;

-- ─── I. Kitchen Summary ────────────────────────────────────────────────────
-- Returns: pending/preparing/ready/completed counts, avg completion time.

CREATE OR REPLACE FUNCTION public.get_kitchen_summary(
  p_cafe_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_pending BIGINT;
  v_preparing BIGINT;
  v_ready BIGINT;
  v_completed BIGINT;
  v_avg_completion_seconds DECIMAL;
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE stage = 'to_cook'),
    COUNT(*) FILTER (WHERE stage = 'preparing'),
    COUNT(*) FILTER (WHERE stage = 'completed' AND completed_at IS NULL),
    COUNT(*) FILTER (WHERE stage = 'completed' AND completed_at IS NOT NULL)
  INTO v_pending, v_preparing, v_ready, v_completed
  FROM kitchen_tickets WHERE cafe_id = p_cafe_id;

  SELECT COALESCE(
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))), 0
  )::DECIMAL INTO v_avg_completion_seconds
  FROM kitchen_tickets
  WHERE cafe_id = p_cafe_id
    AND stage = 'completed'
    AND completed_at IS NOT NULL
    AND created_at >= (NOW() - INTERVAL '7 days');

  v_result := json_build_object(
    'pending', v_pending,
    'preparing', v_preparing,
    'ready', v_ready,
    'completed_today', v_completed,
    'avg_completion_seconds', v_avg_completion_seconds
  );

  RETURN v_result;
END;
$$;

-- ─── J. POS / Table Summary ────────────────────────────────────────────────
-- Returns: orders per table, order type breakdown, payment method distribution.

CREATE OR REPLACE FUNCTION public.get_pos_summary(
  p_cafe_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_table_stats JSON;
  v_order_type_breakdown JSON;
  v_payment_method_breakdown JSON;
BEGIN
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_table_stats
  FROM (
    SELECT
      ct.label AS table_label,
      COUNT(o.id)::BIGINT AS order_count,
      COALESCE(SUM(o.total), 0)::DECIMAL AS revenue
    FROM cafe_tables ct
    LEFT JOIN orders o ON o.table_id = ct.id AND o.cafe_id = ct.cafe_id
      AND o.created_at::DATE >= p_start_date AND o.created_at::DATE <= p_end_date
    WHERE ct.cafe_id = p_cafe_id
    GROUP BY ct.id, ct.label
    ORDER BY order_count DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_order_type_breakdown
  FROM (
    SELECT
      o.source AS order_type,
      COUNT(*)::BIGINT AS count,
      COALESCE(SUM(o.total), 0)::DECIMAL AS revenue
    FROM orders o
    WHERE o.cafe_id = p_cafe_id
      AND o.created_at::DATE >= p_start_date AND o.created_at::DATE <= p_end_date
    GROUP BY o.source
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_payment_method_breakdown
  FROM (
    SELECT
      p.method,
      COUNT(*)::BIGINT AS count,
      COALESCE(SUM(p.amount), 0)::DECIMAL AS total
    FROM payments p
    WHERE p.cafe_id = p_cafe_id
      AND p.status = 'completed'
      AND p.paid_at::DATE >= p_start_date AND p.paid_at::DATE <= p_end_date
    GROUP BY p.method
    ORDER BY total DESC
  ) t;

  v_result := json_build_object(
    'table_stats', v_table_stats,
    'order_type_breakdown', v_order_type_breakdown,
    'payment_method_breakdown', v_payment_method_breakdown
  );

  RETURN v_result;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Performance Indexes — only the genuinely useful ones, with exact index names.
-- idx_customers_cafe_active and idx_customers_cafe_spend are intentionally
-- OMITTED (customers.is_active / customers.lifetime_spend do not exist live).
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_orders_cafe_created ON orders(cafe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_cafe_status ON orders(cafe_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_cafe_source ON orders(cafe_id, source);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_cafe_status ON payments(cafe_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_cafe_created ON purchase_orders(cafe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_cafe_stage ON kitchen_tickets(cafe_id, stage);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_cafe_created ON kitchen_tickets(cafe_id, created_at DESC);
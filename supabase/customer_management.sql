-- ════════════════════════════════════════════════════════════════════════════
-- Customer Management — new columns + merge / deactivate helpers
-- Run this in your Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- Add new columns to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS address       TEXT,
  ADD COLUMN IF NOT EXISTS birthday      DATE,
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visit_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_spend DECIMAL(10,2) NOT NULL DEFAULT 0;

-- RPC: merge duplicate customers
CREATE OR REPLACE FUNCTION merge_customers(
  p_survivor_id UUID,
  p_merged_id UUID,
  p_cafe_id UUID
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  _survivor customers%ROWTYPE;
  _merged customers%ROWTYPE;
BEGIN
  SELECT * INTO _survivor FROM customers WHERE id = p_survivor_id AND cafe_id = p_cafe_id FOR UPDATE;
  SELECT * INTO _merged FROM customers WHERE id = p_merged_id AND cafe_id = p_cafe_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'One or both customers not found'; END IF;

  UPDATE customers
  SET
    email          = COALESCE(_survivor.email, _merged.email),
    phone          = COALESCE(_survivor.phone, _merged.phone),
    address        = COALESCE(_survivor.address, _merged.address),
    birthday       = COALESCE(_survivor.birthday, _merged.birthday),
    loyalty_points = _survivor.loyalty_points + _merged.loyalty_points,
    visit_count    = _survivor.visit_count + _merged.visit_count,
    lifetime_spend = _survivor.lifetime_spend + _merged.lifetime_spend
  WHERE id = p_survivor_id AND cafe_id = p_cafe_id;

  UPDATE orders SET customer_id = p_survivor_id WHERE customer_id = p_merged_id AND cafe_id = p_cafe_id;
  DELETE FROM customers WHERE id = p_merged_id AND cafe_id = p_cafe_id;
  RETURN p_survivor_id;
END;
$$;

-- RPC: refresh customer visit_count and lifetime_spend from orders
CREATE OR REPLACE FUNCTION refresh_customer_stats(
  p_customer_id UUID,
  p_cafe_id UUID
)
RETURNS void
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  _stats RECORD;
BEGIN
  SELECT COUNT(*)::integer AS visit_count, COALESCE(SUM(total), 0) AS lifetime_spend
  INTO _stats
  FROM orders
  WHERE customer_id = p_customer_id AND cafe_id = p_cafe_id AND status IN ('paid', 'completed');

  UPDATE customers
  SET visit_count = _stats.visit_count, lifetime_spend = _stats.lifetime_spend
  WHERE id = p_customer_id AND cafe_id = p_cafe_id;
END;
$$;

-- Add RLS policies for update/delete if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'cafe_scoped_update'
  ) THEN
    CREATE POLICY "cafe_scoped_update" ON customers
      FOR UPDATE USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'cafe_scoped_delete'
  ) THEN
    CREATE POLICY "cafe_scoped_delete" ON customers
      FOR DELETE USING (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

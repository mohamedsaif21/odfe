-- ════════════════════════════════════════════════════════════════════════════
-- Phase 2 — Business Operations
-- Parts: Inventory enhancements + Suppliers + Purchase Orders
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Part A: Inventory enhancements ──────────────────────────────────────────

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS batch_number TEXT;

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS is_wastage BOOLEAN NOT NULL DEFAULT false;

-- ─── Part B: Purchase status enum ────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE purchase_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Part C: Suppliers ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_cafe ON suppliers(cafe_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON suppliers
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

-- ─── Part D: Purchase Orders ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  order_number    TEXT NOT NULL,
  status          purchase_status NOT NULL DEFAULT 'draft',
  total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  ordered_at      TIMESTAMPTZ,
  received_at     TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_cafe ON purchase_orders(cafe_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON purchase_orders
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

-- ─── Part E: Purchase Order Items ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id           UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id           UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity          DECIMAL(10,2) NOT NULL,
  unit_cost         DECIMAL(10,2) NOT NULL DEFAULT 0,
  line_total        DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_cafe ON purchase_order_items(cafe_id);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON purchase_order_items
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

-- ─── Part F: auto-update timestamps for new tables ───────────────────────────

DROP TRIGGER IF EXISTS trg_suppliers_updated ON suppliers;
CREATE TRIGGER trg_suppliers_updated
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

-- ─── Part G: Receive Purchase Order RPC ──────────────────────────────────────

CREATE OR REPLACE FUNCTION receive_purchase_order(
  p_order_id UUID,
  p_cafe_id UUID
)
RETURNS void
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  po_item RECORD;
BEGIN
  -- Update purchase order status
  UPDATE purchase_orders
  SET status = 'received', received_at = now()
  WHERE id = p_order_id AND cafe_id = p_cafe_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  -- Add stock for each item
  FOR po_item IN
    SELECT item_id, quantity
    FROM purchase_order_items
    WHERE purchase_order_id = p_order_id AND cafe_id = p_cafe_id
  LOOP
    UPDATE inventory_items
    SET stock = stock + po_item.quantity
    WHERE id = po_item.item_id AND cafe_id = p_cafe_id;
  END LOOP;

  -- Log stock movements
  INSERT INTO stock_movements (cafe_id, item_id, quantity, type, note, created_by)
  SELECT
    p_cafe_id,
    poi.item_id,
    poi.quantity,
    'in',
    'Received from purchase order ' || (SELECT order_number FROM purchase_orders WHERE id = p_order_id),
    (SELECT created_by FROM purchase_orders WHERE id = p_order_id)
  FROM purchase_order_items poi
  WHERE poi.purchase_order_id = p_order_id AND poi.cafe_id = p_cafe_id;
END;
$$;

-- ─── Part H: Auto-generate order_number for purchase orders ──────────────────

CREATE OR REPLACE FUNCTION generate_po_number(p_cafe_id UUID)
RETURNS TEXT
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number, '-', 2) AS INTEGER)), 0) + 1
  INTO next_num
  FROM purchase_orders
  WHERE cafe_id = p_cafe_id;

  RETURN 'PO-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

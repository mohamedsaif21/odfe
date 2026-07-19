-- ════════════════════════════════════════════════════════════════════════════
-- Inventory Management — new tables for ingredient/stock tracking
-- Run this in your Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- 1. inventory_items — individual raw materials / ingredients
CREATE TABLE IF NOT EXISTS inventory_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id       UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'piece',       -- kg, g, l, ml, piece, packet
  cost_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock         DECIMAL(10,2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. stock_movements — audit trail of stock in/out
CREATE TABLE IF NOT EXISTS stock_movements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id    UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  item_id    UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity   DECIMAL(10,2) NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('in', 'out')),
  note       TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. product_ingredients — link menu products to ingredients
CREATE TABLE IF NOT EXISTS product_ingredients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id     UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity    DECIMAL(10,2) NOT NULL DEFAULT 1,
  UNIQUE(product_id, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_cafe ON inventory_items(cafe_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_cafe ON stock_movements(cafe_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS policies (cafe-scoped)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON inventory_items
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_movements' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON stock_movements
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_ingredients' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON product_ingredients
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_items_updated ON inventory_items;
CREATE TRIGGER trg_inventory_items_updated
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

-- RPC: adjust stock quantity atomically
CREATE OR REPLACE FUNCTION adjust_inventory_stock(
  p_item_id UUID,
  p_cafe_id UUID,
  p_adjustment DECIMAL
)
RETURNS void
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE inventory_items
  SET stock = GREATEST(0, stock + p_adjustment)
  WHERE id = p_item_id AND cafe_id = p_cafe_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;
END;
$$;

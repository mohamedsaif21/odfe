-- Business Operations multi-tenant schema migration
-- Safely upgrades existing Inventory, Recipes, Purchases, Loyalty, and Expenses tables.
-- This migration preserves data, adds cafe_id where missing, and replaces related RPCs.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.purchase_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.update_business_operations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'piece',
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
  expiry_date DATE,
  batch_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  item_id UUID,
  quantity DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'in',
  note TEXT,
  is_wastage BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  product_id UUID,
  item_id UUID,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  supplier_id UUID,
  order_number TEXT,
  status public.purchase_status NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  purchase_order_id UUID,
  item_id UUID,
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  benefits TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  customer_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL,
  reference TEXT,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  customer_id UUID,
  code TEXT NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  reward_given DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  customer_id UUID,
  order_id UUID,
  reward_type TEXT NOT NULL,
  points_used INTEGER NOT NULL DEFAULT 0,
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID,
  category_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS batch_number TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS is_wastage BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.product_ingredients
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS supplier_id UUID,
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS status public.purchase_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID,
  ADD COLUMN IF NOT EXISTS item_id UUID,
  ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.loyalty_tiers
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.referral_codes
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS used_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_given DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.reward_redemptions
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS points_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.expense_categories
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS cafe_id UUID,
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_frequency TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.product_ingredients pi SET cafe_id = p.cafe_id
FROM public.products p
WHERE pi.cafe_id IS NULL AND pi.product_id = p.id;

UPDATE public.product_ingredients pi SET cafe_id = ii.cafe_id
FROM public.inventory_items ii
WHERE pi.cafe_id IS NULL AND pi.item_id = ii.id;

UPDATE public.stock_movements sm SET cafe_id = ii.cafe_id
FROM public.inventory_items ii
WHERE sm.cafe_id IS NULL AND sm.item_id = ii.id;

UPDATE public.purchase_orders po SET cafe_id = s.cafe_id
FROM public.suppliers s
WHERE po.cafe_id IS NULL AND po.supplier_id = s.id;

UPDATE public.purchase_order_items poi SET cafe_id = po.cafe_id
FROM public.purchase_orders po
WHERE poi.cafe_id IS NULL AND poi.purchase_order_id = po.id;

UPDATE public.purchase_order_items poi SET cafe_id = ii.cafe_id
FROM public.inventory_items ii
WHERE poi.cafe_id IS NULL AND poi.item_id = ii.id;

UPDATE public.wallet_transactions wt SET cafe_id = c.cafe_id
FROM public.customers c
WHERE wt.cafe_id IS NULL AND wt.customer_id = c.id;

UPDATE public.referral_codes rc SET cafe_id = c.cafe_id
FROM public.customers c
WHERE rc.cafe_id IS NULL AND rc.customer_id = c.id;

UPDATE public.reward_redemptions rr SET cafe_id = c.cafe_id
FROM public.customers c
WHERE rr.cafe_id IS NULL AND rr.customer_id = c.id;

UPDATE public.expenses e SET cafe_id = ec.cafe_id
FROM public.expense_categories ec
WHERE e.cafe_id IS NULL AND e.category_id = ec.id;

DO $$
DECLARE
  v_default_cafe_id UUID;
BEGIN
  SELECT id INTO v_default_cafe_id FROM public.cafes ORDER BY created_at, id LIMIT 1;

  IF v_default_cafe_id IS NOT NULL THEN
    UPDATE public.inventory_items SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.suppliers SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.purchase_orders SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.purchase_order_items SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.stock_movements SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.product_ingredients SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.loyalty_tiers SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.wallet_transactions SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.referral_codes SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.reward_redemptions SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.expense_categories SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
    UPDATE public.expenses SET cafe_id = v_default_cafe_id WHERE cafe_id IS NULL;
  END IF;
END $$;

UPDATE public.purchase_orders
SET order_number = 'PO-' || LPAD(row_number::TEXT, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY cafe_id ORDER BY created_at, id) AS row_number
  FROM public.purchase_orders
  WHERE order_number IS NULL OR order_number = ''
) numbered
WHERE purchase_orders.id = numbered.id;

UPDATE public.purchase_order_items
SET line_total = quantity * unit_cost
WHERE line_total IS NULL OR line_total = 0;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'inventory_items', 'stock_movements', 'product_ingredients', 'suppliers',
        'purchase_orders', 'purchase_order_items', 'loyalty_tiers',
        'wallet_transactions', 'referral_codes', 'reward_redemptions',
        'expense_categories', 'expenses'
      )
      AND column_name = 'cafe_id'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN cafe_id SET NOT NULL',
      r.table_name
    );
  END LOOP;
EXCEPTION WHEN not_null_violation THEN
  RAISE NOTICE 'Some business rows still have NULL cafe_id; leaving cafe_id nullable until data is assigned.';
END $$;

DO $$
BEGIN
  ALTER TABLE public.inventory_items
    ADD CONSTRAINT inventory_items_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.stock_movements
    ADD CONSTRAINT stock_movements_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.stock_movements
    ADD CONSTRAINT stock_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.product_ingredients
    ADD CONSTRAINT product_ingredients_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.product_ingredients
    ADD CONSTRAINT product_ingredients_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.product_ingredients
    ADD CONSTRAINT product_ingredients_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.suppliers
    ADD CONSTRAINT suppliers_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.purchase_orders
    ADD CONSTRAINT purchase_orders_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.loyalty_tiers
    ADD CONSTRAINT loyalty_tiers_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.referral_codes
    ADD CONSTRAINT referral_codes_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.referral_codes
    ADD CONSTRAINT referral_codes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.expense_categories
    ADD CONSTRAINT expense_categories_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.expenses
    ADD CONSTRAINT expenses_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES public.cafes(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.stock_movements
    ADD CONSTRAINT stock_movements_type_check CHECK (type IN ('in', 'out')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN ('credit', 'debit')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_reward_type_check CHECK (reward_type IN ('points', 'wallet', 'birthday', 'referral', 'tier_discount')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.expenses
    ADD CONSTRAINT expenses_recurring_frequency_check CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly') OR recurring_frequency IS NULL) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_stock_nonnegative CHECK (stock >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.product_ingredients DROP CONSTRAINT IF EXISTS product_ingredients_product_id_item_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ingredients_cafe_product_item
  ON public.product_ingredients(cafe_id, product_id, item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_cafe_order_number
  ON public.purchase_orders(cafe_id, order_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_tiers_cafe_name
  ON public.loyalty_tiers(cafe_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_categories_cafe_name
  ON public.expense_categories(cafe_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_cafe_code
  ON public.referral_codes(cafe_id, code);

CREATE INDEX IF NOT EXISTS idx_inventory_items_cafe ON public.inventory_items(cafe_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_cafe_active ON public.inventory_items(cafe_id, is_active);
CREATE INDEX IF NOT EXISTS idx_stock_movements_cafe ON public.stock_movements(cafe_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_cafe_created ON public.stock_movements(cafe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_cafe ON public.product_ingredients(cafe_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON public.product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_item ON public.product_ingredients(item_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_cafe ON public.suppliers(cafe_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_cafe_active ON public.suppliers(cafe_id, is_active);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_cafe ON public.purchase_orders(cafe_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_cafe_status ON public.purchase_orders(cafe_id, status);
CREATE INDEX IF NOT EXISTS idx_po_items_order ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_cafe ON public.purchase_order_items(cafe_id);
CREATE INDEX IF NOT EXISTS idx_po_items_item ON public.purchase_order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_cafe ON public.loyalty_tiers(cafe_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_customer ON public.wallet_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_cafe ON public.wallet_transactions(cafe_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_customer ON public.referral_codes(customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_cafe ON public.referral_codes(cafe_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_customer ON public.reward_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_order ON public.reward_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_cafe ON public.reward_redemptions(cafe_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_cafe ON public.expense_categories(cafe_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cafe ON public.expenses(cafe_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_cafe_date ON public.expenses(cafe_id, expense_date);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS tier_id UUID,
  ADD COLUMN IF NOT EXISTS total_points_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID,
  ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_spend DECIMAL(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_customers_tier ON public.customers(tier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_cafe_referral_code
  ON public.customers(cafe_id, referral_code)
  WHERE referral_code IS NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.customers
    ADD CONSTRAINT customers_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.loyalty_tiers(id) ON DELETE SET NULL NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.customers
    ADD CONSTRAINT customers_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.customers(id) ON DELETE SET NULL NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_inventory_items_updated ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_updated
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_stock_movements_updated ON public.stock_movements;
CREATE TRIGGER trg_stock_movements_updated
  BEFORE UPDATE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_product_ingredients_updated ON public.product_ingredients;
CREATE TRIGGER trg_product_ingredients_updated
  BEFORE UPDATE ON public.product_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_order_items_updated ON public.purchase_order_items;
CREATE TRIGGER trg_purchase_order_items_updated
  BEFORE UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_loyalty_tiers_updated ON public.loyalty_tiers;
CREATE TRIGGER trg_loyalty_tiers_updated
  BEFORE UPDATE ON public.loyalty_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_wallet_transactions_updated ON public.wallet_transactions;
CREATE TRIGGER trg_wallet_transactions_updated
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_referral_codes_updated ON public.referral_codes;
CREATE TRIGGER trg_referral_codes_updated
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_reward_redemptions_updated ON public.reward_redemptions;
CREATE TRIGGER trg_reward_redemptions_updated
  BEFORE UPDATE ON public.reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_expense_categories_updated ON public.expense_categories;
CREATE TRIGGER trg_expense_categories_updated
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_expenses_updated ON public.expenses;
CREATE TRIGGER trg_expenses_updated
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT unnest(ARRAY[
      'inventory_items', 'stock_movements', 'product_ingredients', 'suppliers',
      'purchase_orders', 'purchase_order_items', 'loyalty_tiers',
      'wallet_transactions', 'referral_codes', 'reward_redemptions',
      'expense_categories', 'expenses'
    ]) AS table_name
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = r.table_name
        AND policyname = 'business_ops_cafe_scoped_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY business_ops_cafe_scoped_all ON public.%I FOR ALL TO authenticated USING (cafe_id = public.auth_cafe_id()) WITH CHECK (cafe_id = public.auth_cafe_id())',
        r.table_name
      );
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
  p_item_id UUID,
  p_cafe_id UUID,
  p_adjustment DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inventory_items
  SET stock = GREATEST(0, stock + p_adjustment)
  WHERE id = p_item_id AND cafe_id = p_cafe_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found for cafe %', p_cafe_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_po_number(p_cafe_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
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

CREATE OR REPLACE FUNCTION public.deduct_stock_for_order(
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
  v_item RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND cafe_id = p_cafe_id
  ) THEN
    RAISE EXCEPTION 'Order not found for cafe %', p_cafe_id;
  END IF;

  FOR v_item IN
    SELECT
      pi.item_id,
      SUM(pi.quantity * oi.quantity)::DECIMAL(10,3) AS total_qty
    FROM public.order_items oi
    JOIN public.product_ingredients pi
      ON pi.product_id = oi.product_id
     AND pi.cafe_id = oi.cafe_id
    JOIN public.inventory_items ii
      ON ii.id = pi.item_id
     AND ii.cafe_id = pi.cafe_id
    WHERE oi.order_id = p_order_id
      AND oi.cafe_id = p_cafe_id
    GROUP BY pi.item_id
  LOOP
    INSERT INTO public.stock_movements (
      cafe_id, item_id, quantity, type, note, is_wastage, created_by
    )
    VALUES (
      p_cafe_id,
      v_item.item_id,
      v_item.total_qty,
      'out',
      'Auto-deducted from order ' || p_order_id::TEXT,
      false,
      p_profile_id
    );

    UPDATE public.inventory_items
    SET stock = GREATEST(0, stock - v_item.total_qty)
    WHERE id = v_item.item_id AND cafe_id = p_cafe_id;
  END LOOP;
END;
$$;

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

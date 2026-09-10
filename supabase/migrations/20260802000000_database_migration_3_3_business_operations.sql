-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 3.3 — CANONICAL CHAIN  0002/0005  BUSINESS OPERATIONS
-- Date: 2026-09-10   Project: ODFE multi-tenant cafe POS
--
-- PURPOSE
--   Reproduces the 12 multi-tenant business tables with the CURRENT (live)
--   column names, the updated_at trigger function, constraints, indexes,
--   RLS enablement and the module-1 cafe_scoped_all policy.
--
-- SOURCED FROM supabase/business_operations_multi_tenant_migration.sql with
-- LIVE-VERIFIED corrections (Probed 2026-09-10):
--   * product_ingredients.inventory_item_id  (NOT item_id), + a unit column
--   * stock_movements.inventory_item_id + movement_type + notes (NOT
--     item_id / type / note), and NO updated_at column live
--   * inventory_items has BOTH current_stock and stock, plus the live-only
--     columns cost_price, reorder_at, reorder_level (absent from the repo;
--     reconstructed here).
--   * purchase_order_items keeps item_id (references inventory_items).
--   * customers has NO address / birthday / is_active / visit_count /
--     lifetime_spend -> the customers ALTER block below only adds the 5
--     columns that ARE live (matching migration_3.3_base_schema).
--   * ENUM PARITY: purchase_status is the live DB's only enum (used by
--     purchase_orders.status). All other status/method/movement/reward/type
--     columns are TEXT + CHECK.
--   * updated_at exists live only on inventory_items, product_ingredients,
--     suppliers, purchase_orders, loyalty_tiers, expense_categories, expenses.
--     stock_movements, purchase_order_items, wallet_transactions,
--     referral_codes and reward_redemptions have NO updated_at and no trigger.
--
-- CONSTRAINTS
--   Foreign keys and CHECKs are declared VALIDATED (inline in CREATE TABLE or
--   plain ADD CONSTRAINT). This removes the M4 reproducibility gap from the
--   historical NOT VALID usage.
--
-- IDEMPOTENCE: CREATE TABLE/INDEX IF NOT EXISTS + guarded ALTERs; the
-- module-1 style policy block drops and recreates by fixed names.
-- ════════════════════════════════════════════════════════════════════════════

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

-- ─── 1. Tables (current live column names) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id       UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'piece',
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock         DECIMAL(10,2) NOT NULL DEFAULT 0,
  minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
  reorder_at    DECIMAL(10,2),
  cost_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  expiry_date   DATE,
  batch_number  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_stock_nonnegative CHECK (stock >= 0 AND current_stock >= 0)
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id          UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity         DECIMAL(10,2) NOT NULL,
  movement_type    TEXT NOT NULL DEFAULT 'in',
  notes            TEXT,
  is_wastage       BOOLEAN NOT NULL DEFAULT false,
  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_type_check CHECK (movement_type IN ('in', 'out'))
);

CREATE TABLE IF NOT EXISTS public.product_ingredients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id          UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity         DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id       UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  supplier_id   UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  order_number  TEXT,
  status        public.purchase_status NOT NULL DEFAULT 'draft',
  total_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  ordered_at    TIMESTAMPTZ,
  received_at   TIMESTAMPTZ,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id            UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  purchase_order_id  UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id            UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity           DECIMAL(10,2) NOT NULL,
  unit_cost          DECIMAL(10,2) NOT NULL DEFAULT 0,
  line_total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by         UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- loyalty_tiers is declared here too, but it is a no-op on a fresh database:
-- migration 0000 already created it because customers.tier_id references it.
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id          UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  min_points       INTEGER NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  benefits         TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id     UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount      DECIMAL(10,2) NOT NULL,
  type        TEXT NOT NULL,
  reference   TEXT,
  description TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallet_transactions_type_check CHECK (type IN ('credit', 'debit'))
);

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id      UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,
  used_count   INTEGER NOT NULL DEFAULT 0,
  reward_given DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id      UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id     UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reward_type  TEXT NOT NULL,
  points_used  INTEGER NOT NULL DEFAULT 0,
  value        DECIMAL(10,2) NOT NULL DEFAULT 0,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reward_redemptions_reward_type_check
    CHECK (reward_type IN ('points', 'wallet', 'birthday', 'referral', 'tier_discount'))
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id      UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id             UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  category_id         UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  amount              DECIMAL(10,2) NOT NULL,
  description         TEXT NOT NULL,
  expense_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring        BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency TEXT,
  notes               TEXT,
  created_by          UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expenses_amount_positive CHECK (amount > 0),
  CONSTRAINT expenses_recurring_frequency_check
    CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly') OR recurring_frequency IS NULL)
);

-- ─── 2. Upgrade guards (idempotent for pre-existing databases) ───────────────
-- Only the live-relevant columns are ensured. The 5 customers columns that do
-- NOT exist live (address, birthday, is_active, visit_count, lifetime_spend)
-- are intentionally omitted.

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_items', 'stock_movements', 'product_ingredients', 'suppliers',
    'purchase_orders', 'purchase_order_items', 'loyalty_tiers',
    'wallet_transactions', 'referral_codes', 'reward_redemptions',
    'expense_categories', 'expenses'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_at DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.product_ingredients
  ADD COLUMN IF NOT EXISTS unit TEXT;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS tier_id UUID,
  ADD COLUMN IF NOT EXISTS total_points_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID,
  ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0;

-- ─── 3. Indexes (current column names) ───────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ingredients_cafe_product_item
  ON public.product_ingredients(cafe_id, product_id, inventory_item_id);

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
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_cafe_created ON public.stock_movements(cafe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_cafe ON public.product_ingredients(cafe_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON public.product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_item ON public.product_ingredients(inventory_item_id);
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

-- ─── 4. updated_at triggers ──────────────────────────────────────────────────
-- LIVE PARITY: only the live tables that actually HAVE an updated_at column get
-- a trigger. stock_movements, purchase_order_items, wallet_transactions,
-- referral_codes and reward_redemptions have NO updated_at on live (verified
-- 2026-09-10) and therefore get none here.

DROP TRIGGER IF EXISTS trg_inventory_items_updated ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_updated
  BEFORE UPDATE ON public.inventory_items
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

DROP TRIGGER IF EXISTS trg_loyalty_tiers_updated ON public.loyalty_tiers;
CREATE TRIGGER trg_loyalty_tiers_updated
  BEFORE UPDATE ON public.loyalty_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_expense_categories_updated ON public.expense_categories;
CREATE TRIGGER trg_expense_categories_updated
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

DROP TRIGGER IF EXISTS trg_expenses_updated ON public.expenses;
CREATE TRIGGER trg_expenses_updated
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_business_operations_updated_at();

-- ─── 5. Business-table RLS policies (module-1 semantics) ─────────────────────
-- Active-profile-aware cafe_scoped_all using app_current_cafe_id(). This is
-- the same block the module-1 migration re-applies later; running both is an
-- idempotent no-op.

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_items', 'stock_movements', 'product_ingredients',
    'suppliers', 'purchase_orders', 'purchase_order_items',
    'loyalty_tiers', 'wallet_transactions', 'referral_codes',
    'reward_redemptions', 'expense_categories', 'expenses'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS business_ops_cafe_scoped_all ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS cafe_scoped_all ON public.%I', t);
    EXECUTE format($policy$
      CREATE POLICY cafe_scoped_all ON public.%I
        FOR ALL TO authenticated
        USING (cafe_id = public.app_current_cafe_id())
        WITH CHECK (cafe_id = public.app_current_cafe_id())
    $policy$, t);
  END LOOP;
END $$;
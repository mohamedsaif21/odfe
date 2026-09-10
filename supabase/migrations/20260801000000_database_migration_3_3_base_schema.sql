-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 3.3 — CANONICAL CHAIN  0000/0005  BASE SCHEMA
-- Date: 2026-09-10   Project: ODFE multi-tenant cafe POS
--
-- PURPOSE
--   First migration of the reconstructed full database chain. Reproduces the
--   base schema: extensions, the base tables, indexes, the
--   auth.users -> profiles/employees trigger, RLS enablement and the
--   auth_cafe_id() helper.
--
-- LIVE PARITY NOTE (Probed 2026-09-10):
--   role / status / stage / method / type / plan / discount_type columns are
--   TEXT with CHECK constraints (NOT enums); the live DB's only enum is
--   public.purchase_status (created in migration 0002).
--
--   ORDERING NOTE: loyalty_tiers is created here (one migration earlier than
--   the rest of the business tables) because customers.tier_id references it;
--   on a fresh database a forward reference to a table created in migration
--   0002 would fail. migration 0002 still re-declares it idempotently.
--
-- SOURCED FROM
--   supabase/seed.sql (schema portion, lines 1-446 + demo seed row).
--   Verified against the LIVE project (bosgplvkuxtykfsnadcv) on 2026-09-10 via
--   PostgREST OpenAPI / column probes:
--     * customers has NO is_active / visit_count / lifetime_spend / address /
--       birthday -> the canonical customers table keeps the 13 live columns.
--     * kitchen_tickets.preparing_at / completed_at are live and are declared
--       inline here.
--     * employees are constrained to admin/cashier/kitchen (employees_role_check).
--     * inventory_items / stock_movements / product_ingredients use the current
--       column names (they are created in migration 0002, not here).
--
-- IDEMPOTENCE
--   CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE / IF NOT EXISTS. Safe on a
--   fresh database and additive on an existing one.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
-- LIVE PARITY (Probed 2026-09-10): the live database uses plain TEXT for every
-- status / method / type / role column (with CHECK constraints), and has only
-- ONE enum type: public.purchase_status (used by purchase_orders.status, created
-- in migration 0002). The historical enums (employee_role, order_status,
-- kitchen_stage, payment_method_type, table_status, discount_type,
-- booking_status, cafe_plan, plan_status, payment_status) do NOT exist live and
-- are therefore NOT created; the affected columns are TEXT + CHECK below.
-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cafes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  owner_id        UUID,
  plan            TEXT NOT NULL DEFAULT 'starter'
                  CHECK (plan IN ('starter', 'growth', 'enterprise')),
  plan_status     TEXT NOT NULL DEFAULT 'active'
                  CHECK (plan_status IN ('active', 'trialing', 'past_due', 'cancelled')),
  razorpay_subscription_id TEXT,
  custom_domain   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  role            TEXT NOT NULL
                  CHECK (role IN ('admin', 'cashier', 'kitchen', 'customer')),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  pin             TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employees_role_check CHECK (role IN ('admin', 'cashier', 'kitchen'))
);

-- Created here (not in 0002) so customers.tier_id can reference it on a
-- fresh database. Matches the live loyalty_tiers shape.
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

-- Live-verified customers shape (13 columns). The address / birthday /
-- is_active / visit_count / lifetime_spend columns from
-- customer_management.sql are intentionally NOT applied (absent live).
CREATE TABLE IF NOT EXISTS public.customers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id            UUID NOT NULL REFERENCES public.cafes(id),
  profile_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  email              TEXT,
  phone              TEXT,
  loyalty_points     INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  tier_id            UUID REFERENCES public.loyalty_tiers(id) ON DELETE SET NULL,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  referral_code      TEXT,
  referred_by        UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  wallet_balance     DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.product_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  name            TEXT NOT NULL,
  icon            TEXT,
  color           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  category_id     UUID NOT NULL REFERENCES public.product_categories(id),
  name            TEXT NOT NULL,
  description     TEXT,
  price           DECIMAL(10,2) NOT NULL,
  tax_rate        DECIMAL(5,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(5,2) NOT NULL DEFAULT 0,
  image_url       TEXT,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.floors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  name            TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cafe_tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  floor_id        UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  label           TEXT NOT NULL,
  seats           INTEGER NOT NULL DEFAULT 2,
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'occupied', 'reserved')),
  qr_token        TEXT,
  qr_image_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  order_number    TEXT NOT NULL,
  table_id        UUID REFERENCES public.cafe_tables(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  employee_id     UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'sent_to_kitchen', 'to_cook',
                                    'preparing', 'completed', 'paid', 'cancelled')),
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_total  DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_total       DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,
  coupon_code     TEXT,
  notes           TEXT,
  source          TEXT NOT NULL DEFAULT 'pos' CHECK (source IN ('pos', 'self_order')),
  session_id      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES public.products(id),
  product_name    TEXT NOT NULL,
  unit_price      DECIMAL(10,2) NOT NULL,
  quantity        INTEGER NOT NULL,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate        DECIMAL(5,2) NOT NULL DEFAULT 0,
  line_total      DECIMAL(10,2) NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kitchen_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number    TEXT NOT NULL,
  table_label     TEXT,
  stage           TEXT NOT NULL DEFAULT 'to_cook'
                  CHECK (stage IN ('to_cook', 'preparing', 'completed')),
  priority        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  preparing_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.kitchen_ticket_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  ticket_id       UUID NOT NULL REFERENCES public.kitchen_tickets(id) ON DELETE CASCADE,
  product_name    TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  notes           TEXT
);

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  type            TEXT NOT NULL CHECK (type IN ('cash', 'card', 'upi', 'split')),
  label           TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  config          JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method          TEXT NOT NULL CHECK (method IN ('cash', 'card', 'upi', 'split')),
  amount          DECIMAL(10,2) NOT NULL,
  reference       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  code            TEXT NOT NULL,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  value           DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_uses        INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('product_based', 'order_amount', 'quantity_based')),
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  value           DECIMAL(10,2) NOT NULL,
  conditions      JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  employee_id     UUID NOT NULL REFERENCES public.employees(id),
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ,
  opening_cash    DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_cash    DECIMAL(10,2),
  total_orders    INTEGER NOT NULL DEFAULT 0,
  total_revenue   DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes           TEXT
);

CREATE TABLE IF NOT EXISTS public.self_order_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  table_id        UUID NOT NULL REFERENCES public.cafe_tables(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  customer_id     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  table_id        UUID REFERENCES public.cafe_tables(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  party_size      INTEGER NOT NULL,
  booking_date    DATE NOT NULL,
  booking_time    TIME NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES public.cafes(id),
  key             TEXT NOT NULL,
  value           JSONB NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cafe_id, key)
);

-- ─── Upgrade guards (idempotent add-on columns for pre-existing databases) ──

ALTER TABLE public.employees ADD CONSTRAINT IF NOT EXISTS employees_role_check
  CHECK (role IN ('admin', 'cashier', 'kitchen'));

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_cafe_id ON public.profiles(cafe_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_employees_cafe_id ON public.employees(cafe_id);
CREATE INDEX IF NOT EXISTS idx_employees_profile_id ON public.employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_products_cafe_id ON public.products(cafe_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_cafe_id ON public.orders(cafe_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_cafe_id ON public.kitchen_tickets(cafe_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_stage ON public.kitchen_tickets(stage);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_cafe_tables_floor_id ON public.cafe_tables(floor_id);
CREATE INDEX IF NOT EXISTS idx_coupons_cafe_id ON public.coupons(cafe_id);
CREATE INDEX IF NOT EXISTS idx_self_order_tokens_token ON public.self_order_tokens(token);

CREATE INDEX IF NOT EXISTS idx_customers_tier ON public.customers(tier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_cafe_referral_code
  ON public.customers(cafe_id, referral_code)
  WHERE referral_code IS NOT NULL;

-- ─── Auto-create profile on signup ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  _cafe_id UUID;
  _role TEXT;
BEGIN
  -- Assign the first cafe (or create a fallback)
  SELECT id INTO _cafe_id FROM public.cafes ORDER BY created_at LIMIT 1;
  IF _cafe_id IS NULL THEN
    INSERT INTO public.cafes (name, slug) VALUES ('Default Cafe', 'default')
    RETURNING id INTO _cafe_id;
  END IF;

  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'cashier');
  IF _role NOT IN ('admin', 'cashier', 'kitchen', 'customer') THEN
    _role := 'cashier';
  END IF;

  INSERT INTO public.profiles (id, cafe_id, role, full_name, email, is_active)
  VALUES (
    NEW.id,
    _cafe_id,
    _role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    true
  );

  -- H1 FIX (canonical chain): customers get a profile but NO employees row.
  -- employees_role_check allows only admin/cashier/kitchen, so inserting a
  -- 'customer' employee would violate the live constraint.
  IF _role = 'customer' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.employees (cafe_id, profile_id, role)
  VALUES (_cafe_id, NEW.id, _role);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── Row-Level Security (enabled; policies applied in migration 0001) ────────

ALTER TABLE public.cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_order_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ─── Helper: get user's cafe_id ──────────────────────────────────────────────
-- Kept identical to the live helper (no is_active check). The active-aware
-- resolution lives in app_current_cafe_id() (migration 0001).

CREATE OR REPLACE FUNCTION public.auth_cafe_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT cafe_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ─── Bootstrap seed row (matches seed.sql) ───────────────────────────────────
-- Creates a cafe so the signup trigger has something to assign.

INSERT INTO public.cafes (name, slug) VALUES ('OdFe Demo Cafe', 'odfe-demo')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.settings (cafe_id, key, value)
SELECT id, 'self_order', '{"mode":"online_ordering"}'::jsonb
FROM public.cafes
WHERE slug = 'odfe-demo'
ON CONFLICT (cafe_id, key) DO NOTHING;
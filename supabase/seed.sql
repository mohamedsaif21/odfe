-- ════════════════════════════════════════════════════════════════════════════
-- OdFe — Database Schema + Seed
-- Run this in your Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE employee_role AS ENUM ('admin', 'cashier', 'kitchen');
CREATE TYPE order_status AS ENUM (
  'draft', 'sent_to_kitchen', 'to_cook', 'preparing',
  'completed', 'paid', 'cancelled'
);
CREATE TYPE kitchen_stage AS ENUM ('to_cook', 'preparing', 'completed');
CREATE TYPE payment_method_type AS ENUM ('cash', 'card', 'upi', 'split');
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved');
CREATE TYPE discount_type AS ENUM ('percentage', 'flat');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE cafe_plan AS ENUM ('starter', 'growth', 'enterprise');
CREATE TYPE plan_status AS ENUM ('active', 'trialing', 'past_due', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE cafes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  owner_id        UUID,
  plan            cafe_plan NOT NULL DEFAULT 'starter',
  plan_status     plan_status NOT NULL DEFAULT 'active',
  razorpay_subscription_id TEXT,
  custom_domain   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  role            employee_role NOT NULL,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            employee_role NOT NULL,
  pin             TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  loyalty_points  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  name            TEXT NOT NULL,
  icon            TEXT,
  color           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  category_id     UUID NOT NULL REFERENCES product_categories(id),
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

CREATE TABLE floors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  name            TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cafe_tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  floor_id        UUID REFERENCES floors(id) ON DELETE SET NULL,
  label           TEXT NOT NULL,
  seats           INTEGER NOT NULL DEFAULT 2,
  status          table_status NOT NULL DEFAULT 'available',
  qr_token        TEXT,
  qr_image_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  order_number    TEXT NOT NULL,
  table_id        UUID REFERENCES cafe_tables(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  employee_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
  status          order_status NOT NULL DEFAULT 'draft',
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_total  DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_total       DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,
  coupon_code     TEXT,
  notes           TEXT,
  session_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  product_name    TEXT NOT NULL,
  unit_price      DECIMAL(10,2) NOT NULL,
  quantity        INTEGER NOT NULL,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate        DECIMAL(5,2) NOT NULL DEFAULT 0,
  line_total      DECIMAL(10,2) NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kitchen_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number    TEXT NOT NULL,
  table_label     TEXT,
  stage           kitchen_stage NOT NULL DEFAULT 'to_cook',
  priority        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kitchen_ticket_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  ticket_id       UUID NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
  product_name    TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  notes           TEXT
);

CREATE TABLE payment_methods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  type            payment_method_type NOT NULL,
  label           TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  config          JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method          payment_method_type NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  reference       TEXT,
  status          payment_status NOT NULL DEFAULT 'pending',
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  code            TEXT NOT NULL,
  discount_type   discount_type NOT NULL,
  value           DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_uses        INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('product_based', 'order_amount', 'quantity_based')),
  discount_type   discount_type NOT NULL,
  value           DECIMAL(10,2) NOT NULL,
  conditions      JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pos_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  employee_id     UUID NOT NULL REFERENCES employees(id),
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ,
  opening_cash    DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_cash    DECIMAL(10,2),
  total_orders    INTEGER NOT NULL DEFAULT 0,
  total_revenue   DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes           TEXT
);

CREATE TABLE self_order_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  table_id        UUID NOT NULL REFERENCES cafe_tables(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  table_id        UUID REFERENCES cafe_tables(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  party_size      INTEGER NOT NULL,
  booking_date    DATE NOT NULL,
  booking_time    TIME NOT NULL,
  status          booking_status NOT NULL DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id),
  key             TEXT NOT NULL,
  value           JSONB NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cafe_id, key)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_profiles_cafe_id ON profiles(cafe_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_employees_cafe_id ON employees(cafe_id);
CREATE INDEX idx_employees_profile_id ON employees(profile_id);
CREATE INDEX idx_products_cafe_id ON products(cafe_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_orders_cafe_id ON orders(cafe_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_kitchen_tickets_cafe_id ON kitchen_tickets(cafe_id);
CREATE INDEX idx_kitchen_tickets_stage ON kitchen_tickets(stage);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_cafe_tables_floor_id ON cafe_tables(floor_id);
CREATE INDEX idx_coupons_cafe_id ON coupons(cafe_id);
CREATE INDEX idx_self_order_tokens_token ON self_order_tokens(token);

-- ─── Auto-create profile on signup ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  _cafe_id UUID;
BEGIN
  -- Assign the first cafe (or create a fallback)
  SELECT id INTO _cafe_id FROM public.cafes ORDER BY created_at LIMIT 1;
  IF _cafe_id IS NULL THEN
    INSERT INTO public.cafes (name, slug) VALUES ('Default Cafe', 'default')
    RETURNING id INTO _cafe_id;
  END IF;

  INSERT INTO public.profiles (id, cafe_id, role, full_name, email, is_active)
  VALUES (
    NEW.id,
    _cafe_id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')::public.employee_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    true
  );

  INSERT INTO public.employees (cafe_id, profile_id, role)
  VALUES (
    _cafe_id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')::public.employee_role
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ─── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_order_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ─── Helper: get user's cafe_id ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_cafe_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT cafe_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ─── RLS Policies ────────────────────────────────────────────────────────────

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_cafe" ON profiles
  FOR SELECT USING (
    cafe_id = auth_cafe_id() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "employees_select" ON employees
  FOR SELECT USING (
    profile_id = auth.uid() OR
    cafe_id = auth_cafe_id()
  );

CREATE POLICY "cafe_scoped_select" ON orders
  FOR SELECT USING (cafe_id = auth_cafe_id());
CREATE POLICY "cafe_scoped_select" ON products
  FOR SELECT USING (cafe_id = auth_cafe_id());
CREATE POLICY "cafe_scoped_select" ON product_categories
  FOR SELECT USING (cafe_id = auth_cafe_id());
CREATE POLICY "cafe_scoped_select" ON cafe_tables
  FOR SELECT USING (cafe_id = auth_cafe_id());
CREATE POLICY "cafe_scoped_select" ON customers
  FOR SELECT USING (cafe_id = auth_cafe_id());
CREATE POLICY "cafe_scoped_select" ON order_items
  FOR SELECT USING (cafe_id = auth_cafe_id());

-- ════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ════════════════════════════════════════════════════════════════════════════

-- Creates a cafe so the signup trigger has something to assign.
INSERT INTO cafes (name, slug) VALUES ('OdFe Demo Cafe', 'odfe-demo');

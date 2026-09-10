-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 3.3 — CANONICAL CHAIN  0001/0005  APP HELPERS + RLS POLICIES
-- Date: 2026-09-10   Project: ODFE multi-tenant cafe POS
--
-- PURPOSE
--   Defines the application helper function family used by the live database
--   (the app_current_* / app_is_* / app_same_cafe helpers), the RLS policies
--   for the 20 core tables, the employees policy (module-1 semantics) and the
--   cafe-scoped storage policies.
--
-- LIVE-VERIFIED FACTS (Probed 2026-09-10 via PostgREST RPC, service_role):
--   * The following functions EXIST live (zero-arg, STABLE):
--       app_current_cafe_id()   -> uuid     (null for service_role / no auth)
--       app_current_role()      -> text     (raw_user role; null w/o auth)
--       app_customer_id()       -> uuid     (null w/o auth)
--       app_is_admin()          -> boolean  (false w/o auth)
--       app_is_cashier()        -> boolean
--       app_is_kitchen()        -> boolean
--       app_is_staff()          -> boolean
--       current_user_cafe_id()  -> uuid     (alias)
--       current_user_is_admin() -> boolean  (alias)
--       auth_cafe_id()          -> uuid     (also present)
--   * current_cafe_id(), current_user_role(), has_cafe_role(), ... (the
--     rls_hardening.sql family) do NOT exist live under those names.
--   * Their bodies are NOT recoverable via PostgREST. The definitions below
--     are RECONSTRUCTED to match observed signatures and semantics; they use
--     the same profiles-lookup pattern that the repository's other helpers use
--     and meet the needs of every caller in the repo (module-1 migration,
--     dashboard_analytics, storage guards).
--
-- POLICIES
--   The 20 core tables keep the seed.sql policy set (auth_cafe_id() based),
--   matching the live surface. Business-operations policies (module-1
--   cafe_scoped_all using app_current_cafe_id()) are applied in migration 0002
--   right after those tables are created. employees_select is rebuilt here
--   with the module-1 active-profile-aware semantics.
--
-- IDEMPOTENCE: DROP POLICY IF EXISTS + CREATE POLICY; CREATE OR REPLACE.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. App helper family (reconstructed to live signatures) ────────────────

CREATE OR REPLACE FUNCTION public.app_current_cafe_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.cafe_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_current_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role::text
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_customer_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.customers c
  WHERE c.profile_id = auth.uid()
    AND c.cafe_id = public.app_current_cafe_id()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_same_cafe(target_cafe_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.cafe_id = target_cafe_id
  )
$$;

CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.app_is_cashier()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.role = 'cashier'
  )
$$;

CREATE OR REPLACE FUNCTION public.app_is_kitchen()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.role = 'kitchen'
  )
$$;

CREATE OR REPLACE FUNCTION public.app_is_staff()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.role IN ('admin', 'cashier', 'kitchen')
  )
$$;

-- Aliases observed on live (current_user_* name family)
CREATE OR REPLACE FUNCTION public.current_user_cafe_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_current_cafe_id()
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_is_admin()
$$;

-- ─── 2. RLS policies — 20 core tables ────────────────────────────────────────
-- Same policy surface as seed.sql (auth_cafe_id based), rebuilt idempotently.

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

-- Profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_select_cafe ON public.profiles;
CREATE POLICY profiles_select_cafe ON public.profiles
  FOR SELECT USING (
    cafe_id = public.auth_cafe_id() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Employees (module-1 active-profile-aware version)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees
  FOR SELECT TO authenticated
  USING ((profile_id = auth.uid() AND cafe_id = public.app_current_cafe_id())
         OR cafe_id = public.app_current_cafe_id());

-- Core tables: cafe_scoped_select
DROP POLICY IF EXISTS cafe_scoped_select ON public.orders;
CREATE POLICY cafe_scoped_select ON public.orders
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.products;
CREATE POLICY cafe_scoped_select ON public.products
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.product_categories;
CREATE POLICY cafe_scoped_select ON public.product_categories
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.cafe_tables;
CREATE POLICY cafe_scoped_select ON public.cafe_tables
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.customers;
CREATE POLICY cafe_scoped_select ON public.customers
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.order_items;
CREATE POLICY cafe_scoped_select ON public.order_items
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.kitchen_tickets;
CREATE POLICY cafe_scoped_select ON public.kitchen_tickets
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.kitchen_ticket_items;
CREATE POLICY cafe_scoped_select ON public.kitchen_ticket_items
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.payments;
CREATE POLICY cafe_scoped_select ON public.payments
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.payment_methods;
CREATE POLICY cafe_scoped_select ON public.payment_methods
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.coupons;
CREATE POLICY cafe_scoped_select ON public.coupons
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.bookings;
CREATE POLICY cafe_scoped_select ON public.bookings
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.settings;
CREATE POLICY cafe_scoped_select ON public.settings
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_select ON public.self_order_tokens;
CREATE POLICY cafe_scoped_select ON public.self_order_tokens
  FOR SELECT TO authenticated USING (cafe_id = public.auth_cafe_id());

-- Core tables: cafe_scoped_insert
DROP POLICY IF EXISTS cafe_scoped_insert ON public.orders;
CREATE POLICY cafe_scoped_insert ON public.orders
  FOR INSERT TO authenticated WITH CHECK (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_insert ON public.order_items;
CREATE POLICY cafe_scoped_insert ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_insert ON public.kitchen_tickets;
CREATE POLICY cafe_scoped_insert ON public.kitchen_tickets
  FOR INSERT TO authenticated WITH CHECK (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_insert ON public.kitchen_ticket_items;
CREATE POLICY cafe_scoped_insert ON public.kitchen_ticket_items
  FOR INSERT TO authenticated WITH CHECK (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_insert ON public.bookings;
CREATE POLICY cafe_scoped_insert ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_insert ON public.settings;
CREATE POLICY cafe_scoped_insert ON public.settings
  FOR INSERT TO authenticated WITH CHECK (cafe_id = public.auth_cafe_id());

-- Core tables: cafe_scoped_update
DROP POLICY IF EXISTS cafe_scoped_update ON public.orders;
CREATE POLICY cafe_scoped_update ON public.orders
  FOR UPDATE TO authenticated
  USING (cafe_id = public.auth_cafe_id()) WITH CHECK (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_update ON public.kitchen_tickets;
CREATE POLICY cafe_scoped_update ON public.kitchen_tickets
  FOR UPDATE TO authenticated
  USING (cafe_id = public.auth_cafe_id()) WITH CHECK (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_update ON public.cafe_tables;
CREATE POLICY cafe_scoped_update ON public.cafe_tables
  FOR UPDATE TO authenticated
  USING (cafe_id = public.auth_cafe_id()) WITH CHECK (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_update ON public.bookings;
CREATE POLICY cafe_scoped_update ON public.bookings
  FOR UPDATE TO authenticated
  USING (cafe_id = public.auth_cafe_id()) WITH CHECK (cafe_id = public.auth_cafe_id());

DROP POLICY IF EXISTS cafe_scoped_update ON public.settings;
CREATE POLICY cafe_scoped_update ON public.settings
  FOR UPDATE TO authenticated
  USING (cafe_id = public.auth_cafe_id()) WITH CHECK (cafe_id = public.auth_cafe_id());

-- ─── 3. Cafe-scoped storage policies (product-images bucket) ────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS product_images_public_select ON storage.objects;
CREATE POLICY product_images_public_select ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_insert_cafe" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_update_cafe" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_delete_cafe" ON storage.objects;

CREATE POLICY "product_images_authenticated_insert_cafe" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.app_current_cafe_id()::text
  );

CREATE POLICY "product_images_authenticated_update_cafe" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.app_current_cafe_id()::text
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.app_current_cafe_id()::text
  );

CREATE POLICY "product_images_authenticated_delete_cafe" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.app_current_cafe_id()::text
  );
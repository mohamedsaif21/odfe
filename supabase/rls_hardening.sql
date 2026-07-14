-- OdFe RLS hardening
-- Apply after supabase/seed.sql or after the base schema exists.
--
-- Role model:
-- - admin: full access inside their own cafe, including employees/settings/finance.
-- - cashier: POS/customer/order/payment operations inside their own cafe; no employees/settings.
-- - kitchen: kitchen tickets and order status inside their own cafe; no finance/employees/settings.
-- - customer: own profile/customer row and own orders only, plus active menu/self-order settings.
-- - anon QR visitor: active QR token, active menu, public cafe/table label, and self-order mode only.
--
-- Supabase service_role bypasses RLS by design. Keep it server-only.

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

CREATE OR REPLACE FUNCTION public.current_cafe_id()
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

CREATE OR REPLACE FUNCTION public.current_user_role()
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

CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.customers c
  WHERE c.profile_id = auth.uid()
    AND c.cafe_id = public.current_cafe_id()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_cafe_role(target_cafe_id UUID, allowed_roles TEXT[])
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
      AND p.role::text = ANY (allowed_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_public_qr_cafe(target_cafe_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.self_order_tokens t
    WHERE t.cafe_id = target_cafe_id
      AND t.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_public_qr_table(target_table_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.self_order_tokens t
    WHERE t.table_id = target_table_id
      AND t.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.customer_owns_order(target_order_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    WHERE o.id = target_order_id
      AND o.cafe_id = public.current_cafe_id()
      AND c.profile_id = auth.uid()
  )
$$;

DO $$
DECLARE
  table_name TEXT;
  policy_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'cafes', 'profiles', 'employees', 'customers', 'product_categories',
    'products', 'floors', 'cafe_tables', 'orders', 'order_items',
    'kitchen_tickets', 'kitchen_ticket_items', 'payment_methods', 'payments',
    'coupons', 'promotions', 'pos_sessions', 'self_order_tokens', 'bookings',
    'settings'
  ]
  LOOP
    FOR policy_name IN
      SELECT pol.polname
      FROM pg_policy pol
      JOIN pg_class cls ON cls.oid = pol.polrelid
      JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
      WHERE nsp.nspname = 'public'
        AND cls.relname = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    END LOOP;
  END LOOP;
END $$;

-- Cafes
CREATE POLICY "cafe_authenticated_select" ON cafes
  FOR SELECT TO authenticated
  USING (id = public.current_cafe_id());

CREATE POLICY "cafe_public_qr_select" ON cafes
  FOR SELECT TO anon
  USING (public.is_public_qr_cafe(id));

CREATE POLICY "cafe_admin_update" ON cafes
  FOR UPDATE TO authenticated
  USING (public.has_cafe_role(id, ARRAY['admin']))
  WITH CHECK (public.has_cafe_role(id, ARRAY['admin']));

-- Profiles and employees
CREATE POLICY "profiles_self_select" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin']));

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND cafe_id = public.current_cafe_id()
    AND role::text = public.current_user_role()
  );

CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin']));

CREATE POLICY "employees_self_select" ON employees
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() AND cafe_id = public.current_cafe_id());

CREATE POLICY "employees_admin_select" ON employees
  FOR SELECT TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin']));

CREATE POLICY "employees_admin_write" ON employees
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin']));

-- Customers
CREATE POLICY "customers_staff_select" ON customers
  FOR SELECT TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "customers_self_select" ON customers
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() AND cafe_id = public.current_cafe_id());

CREATE POLICY "customers_staff_write" ON customers
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "customers_self_update" ON customers
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() AND cafe_id = public.current_cafe_id())
  WITH CHECK (profile_id = auth.uid() AND cafe_id = public.current_cafe_id());

-- Menu and tables
CREATE POLICY "categories_select" ON product_categories
  FOR SELECT TO anon, authenticated
  USING (
    (auth.role() = 'anon' AND is_active = true AND public.is_public_qr_cafe(cafe_id))
    OR public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen', 'customer'])
  );

CREATE POLICY "categories_admin_cashier_write" ON product_categories
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "products_select" ON products
  FOR SELECT TO anon, authenticated
  USING (
    (auth.role() = 'anon' AND is_available = true AND public.is_public_qr_cafe(cafe_id))
    OR public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen', 'customer'])
  );

CREATE POLICY "products_admin_cashier_write" ON products
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "floors_select" ON floors
  FOR SELECT TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen', 'customer']));

CREATE POLICY "floors_admin_cashier_write" ON floors
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "tables_select" ON cafe_tables
  FOR SELECT TO anon, authenticated
  USING (
    (auth.role() = 'anon' AND public.is_public_qr_table(id))
    OR public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen', 'customer'])
  );

CREATE POLICY "tables_admin_cashier_write" ON cafe_tables
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

-- Orders and kitchen
CREATE POLICY "orders_select" ON orders
  FOR SELECT TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen'])
    OR customer_id = public.current_customer_id()
  );

CREATE POLICY "orders_insert" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR (public.has_cafe_role(cafe_id, ARRAY['customer']) AND customer_id = public.current_customer_id())
  );

CREATE POLICY "orders_update" ON orders
  FOR UPDATE TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen']));

CREATE POLICY "orders_delete" ON orders
  FOR DELETE TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR (public.has_cafe_role(cafe_id, ARRAY['customer']) AND customer_id = public.current_customer_id())
  );

CREATE POLICY "order_items_select" ON order_items
  FOR SELECT TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen'])
    OR public.customer_owns_order(order_id)
  );

CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR public.customer_owns_order(order_id)
  );

CREATE POLICY "order_items_update" ON order_items
  FOR UPDATE TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "order_items_delete" ON order_items
  FOR DELETE TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR public.customer_owns_order(order_id)
  );

CREATE POLICY "tickets_select" ON kitchen_tickets
  FOR SELECT TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen'])
    OR public.customer_owns_order(order_id)
  );

CREATE POLICY "tickets_insert" ON kitchen_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR public.customer_owns_order(order_id)
  );

CREATE POLICY "tickets_update" ON kitchen_tickets
  FOR UPDATE TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen']));

CREATE POLICY "tickets_delete" ON kitchen_tickets
  FOR DELETE TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR public.customer_owns_order(order_id)
  );

CREATE POLICY "ticket_items_select" ON kitchen_ticket_items
  FOR SELECT TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen'])
    OR EXISTS (
      SELECT 1
      FROM public.kitchen_tickets kt
      WHERE kt.id = ticket_id
        AND public.customer_owns_order(kt.order_id)
    )
  );

CREATE POLICY "ticket_items_insert" ON kitchen_ticket_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR EXISTS (
      SELECT 1
      FROM public.kitchen_tickets kt
      WHERE kt.id = ticket_id
        AND public.customer_owns_order(kt.order_id)
    )
  );

CREATE POLICY "ticket_items_update" ON kitchen_ticket_items
  FOR UPDATE TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier', 'kitchen']));

CREATE POLICY "ticket_items_delete" ON kitchen_ticket_items
  FOR DELETE TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR EXISTS (
      SELECT 1
      FROM public.kitchen_tickets kt
      WHERE kt.id = ticket_id
        AND public.customer_owns_order(kt.order_id)
    )
  );

-- Finance and POS
CREATE POLICY "payment_methods_select" ON payment_methods
  FOR SELECT TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "payment_methods_admin_write" ON payment_methods
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin']));

CREATE POLICY "payments_admin_cashier_select" ON payments
  FOR SELECT TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "payments_admin_cashier_write" ON payments
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "pos_sessions_admin_cashier_select" ON pos_sessions
  FOR SELECT TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "pos_sessions_admin_cashier_write" ON pos_sessions
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

-- Discounts and promotions
CREATE POLICY "coupons_select" ON coupons
  FOR SELECT TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR (public.has_cafe_role(cafe_id, ARRAY['customer']) AND is_active = true)
  );

CREATE POLICY "coupons_admin_cashier_write" ON coupons
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "promotions_select" ON promotions
  FOR SELECT TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR (public.has_cafe_role(cafe_id, ARRAY['customer']) AND is_active = true)
  );

CREATE POLICY "promotions_admin_write" ON promotions
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin']));

-- QR tokens, bookings, settings
CREATE POLICY "self_order_tokens_select" ON self_order_tokens
  FOR SELECT TO anon, authenticated
  USING (
    (auth.role() = 'anon' AND is_active = true)
    OR (is_active = true AND public.has_cafe_role(cafe_id, ARRAY['customer']))
    OR public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
  );

CREATE POLICY "self_order_tokens_admin_cashier_write" ON self_order_tokens
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier']));

CREATE POLICY "bookings_select" ON bookings
  FOR SELECT TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR customer_id = public.current_customer_id()
  );

CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR (public.has_cafe_role(cafe_id, ARRAY['customer']) AND customer_id = public.current_customer_id())
  );

CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR customer_id = public.current_customer_id()
  )
  WITH CHECK (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR customer_id = public.current_customer_id()
  );

CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE TO authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin', 'cashier'])
    OR customer_id = public.current_customer_id()
  );

CREATE POLICY "settings_select" ON settings
  FOR SELECT TO anon, authenticated
  USING (
    public.has_cafe_role(cafe_id, ARRAY['admin'])
    OR (
      key IN ('self_order', 'self_order_settings', 'customer_ordering', 'ordering')
      AND (
        public.has_cafe_role(cafe_id, ARRAY['customer'])
        OR (auth.role() = 'anon' AND public.is_public_qr_cafe(cafe_id))
      )
    )
  );

CREATE POLICY "settings_admin_write" ON settings
  FOR ALL TO authenticated
  USING (public.has_cafe_role(cafe_id, ARRAY['admin']))
  WITH CHECK (public.has_cafe_role(cafe_id, ARRAY['admin']));

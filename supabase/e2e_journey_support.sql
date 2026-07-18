-- OdFe E2E journey support functions
-- Apply after the base schema. These functions are called by existing route
-- handlers for admin onboarding and employee creation.

CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT trim(both '-' FROM regexp_replace(lower(coalesce(input, 'cafe')), '[^a-z0-9]+', '-', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.onboard_admin_owner(
  p_user_id UUID,
  p_cafe_name TEXT,
  p_full_name TEXT
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
  v_base_slug TEXT;
  v_slug TEXT;
  v_cafe_id UUID;
  v_employee_id UUID;
  v_counter INTEGER := 0;
BEGIN
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;

  v_base_slug := nullif(public.slugify(p_cafe_name), '');
  IF v_base_slug IS NULL THEN
    v_base_slug := 'cafe';
  END IF;
  v_slug := v_base_slug;

  WHILE EXISTS (SELECT 1 FROM public.cafes WHERE slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter::TEXT;
  END LOOP;

  INSERT INTO public.cafes (name, slug, owner_id)
  VALUES (p_cafe_name, v_slug, p_user_id)
  RETURNING id INTO v_cafe_id;

  INSERT INTO public.profiles (id, cafe_id, role, full_name, email, is_active)
  VALUES (p_user_id, v_cafe_id, 'admin', p_full_name, v_email, true)
  ON CONFLICT (id) DO UPDATE
    SET cafe_id = EXCLUDED.cafe_id,
        role = 'admin',
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        is_active = true;

  DELETE FROM public.employees
  WHERE profile_id = p_user_id
    AND cafe_id <> v_cafe_id;

  INSERT INTO public.employees (cafe_id, profile_id, role)
  VALUES (v_cafe_id, p_user_id, 'admin')
  RETURNING id INTO v_employee_id;

  INSERT INTO public.payment_methods (cafe_id, type, label, is_active)
  VALUES
    (v_cafe_id, 'cash', 'Cash', true),
    (v_cafe_id, 'card', 'Card', true),
    (v_cafe_id, 'upi', 'UPI', true),
    (v_cafe_id, 'split', 'Split', true);

  INSERT INTO public.settings (cafe_id, key, value)
  VALUES (v_cafe_id, 'self_order', '{"mode":"online_ordering"}'::jsonb)
  ON CONFLICT (cafe_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  RETURN jsonb_build_object(
    'cafe_id', v_cafe_id,
    'profile_id', p_user_id,
    'employee_id', v_employee_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_employee(
  p_admin_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT,
  p_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_cafe_id UUID;
  v_auth_id UUID;
  v_employee_id UUID;
BEGIN
  IF p_role NOT IN ('cashier', 'kitchen') THEN
    RAISE EXCEPTION 'Invalid employee role';
  END IF;

  SELECT cafe_id INTO v_cafe_id
  FROM public.profiles
  WHERE id = p_admin_id
    AND role = 'admin'
    AND is_active = true;

  IF v_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;

  INSERT INTO public.profiles (id, cafe_id, role, full_name, email, is_active)
  VALUES (v_auth_id, v_cafe_id, p_role::public.employee_role, p_full_name, p_email, true)
  ON CONFLICT (id) DO UPDATE
    SET cafe_id = EXCLUDED.cafe_id,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        is_active = true;

  DELETE FROM public.employees
  WHERE profile_id = v_auth_id
    AND cafe_id <> v_cafe_id;

  INSERT INTO public.employees (cafe_id, profile_id, role, pin)
  VALUES (v_cafe_id, v_auth_id, p_role::public.employee_role, p_pin)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_employee_id;

  IF v_employee_id IS NULL THEN
    SELECT id INTO v_employee_id
    FROM public.employees
    WHERE profile_id = v_auth_id
      AND cafe_id = v_cafe_id
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'auth_id', v_auth_id,
    'profile_id', v_auth_id,
    'employee_id', v_employee_id
  );
END;
$$;

ALTER TABLE public.kitchen_tickets
  ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ;

ALTER TABLE public.kitchen_tickets
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.advance_kitchen_ticket(
  p_ticket_id UUID,
  p_order_id UUID,
  p_next_stage public.kitchen_stage,
  p_previous_stage public.kitchen_stage
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cafe_id UUID;
  v_current_stage public.kitchen_stage;
  v_role TEXT;
BEGIN
  SELECT kt.cafe_id, kt.stage
    INTO v_cafe_id, v_current_stage
  FROM public.kitchen_tickets kt
  WHERE kt.id = p_ticket_id
    AND kt.order_id = p_order_id;

  IF v_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Kitchen ticket not found';
  END IF;

  SELECT p.role::text
    INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.cafe_id = v_cafe_id
    AND p.is_active = true
  LIMIT 1;

  IF v_role NOT IN ('admin', 'kitchen') THEN
    RAISE EXCEPTION 'Kitchen access required';
  END IF;

  IF v_current_stage <> p_previous_stage THEN
    RAISE EXCEPTION 'Kitchen ticket stage changed. Refresh and try again.';
  END IF;

  IF p_previous_stage = 'to_cook' AND p_next_stage = 'preparing' THEN
    UPDATE public.kitchen_tickets
    SET
      stage = 'preparing',
      preparing_at = COALESCE(preparing_at, now()),
      updated_at = now()
    WHERE id = p_ticket_id;

    UPDATE public.orders
    SET
      status = 'preparing',
      updated_at = now()
    WHERE id = p_order_id
      AND cafe_id = v_cafe_id;

    RETURN;
  END IF;

  IF p_previous_stage = 'preparing' AND p_next_stage = 'completed' THEN
    UPDATE public.kitchen_tickets
    SET
      stage = 'completed',
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
    WHERE id = p_ticket_id;

    UPDATE public.orders
    SET
      status = 'completed',
      updated_at = now()
    WHERE id = p_order_id
      AND cafe_id = v_cafe_id;

    RETURN;
  END IF;

  RAISE EXCEPTION 'Invalid kitchen ticket stage transition';
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_public_self_order_token(
  p_token TEXT
)
RETURNS TABLE (
  cafe_id UUID,
  table_id UUID,
  table_label TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.cafe_id,
    ct.id AS table_id,
    ct.label AS table_label
  FROM public.self_order_tokens t
  JOIN public.cafe_tables ct
    ON ct.id = t.table_id
   AND ct.cafe_id = t.cafe_id
  WHERE t.token = p_token
    AND t.is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.create_order_with_kitchen_ticket(
  p_cafe_id UUID,
  p_table_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_employee_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_coupon_code TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'pos',
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  ticket_id UUID,
  subtotal NUMERIC,
  discount_total NUMERIC,
  tax_total NUMERIC,
  total NUMERIC
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_auth_cafe_id UUID;
  v_order_id UUID;
  v_ticket_id UUID;
  v_order_number TEXT;
  v_table_label TEXT;
  v_coupon_id UUID;
  v_coupon_discount_type TEXT;
  v_coupon_value NUMERIC;
  v_coupon_discount NUMERIC := 0;
BEGIN
  IF p_source NOT IN ('pos', 'self_order') THEN
    RAISE EXCEPTION 'Invalid order source';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  SELECT p.role::text, p.cafe_id
    INTO v_role, v_auth_cafe_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true
  LIMIT 1;

  IF v_auth_cafe_id IS NULL OR v_auth_cafe_id <> p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  IF p_source = 'pos' THEN
    IF v_role NOT IN ('admin', 'cashier') THEN
      RAISE EXCEPTION 'Admin or cashier access required';
    END IF;

    IF p_employee_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = p_employee_id
        AND e.cafe_id = p_cafe_id
    ) THEN
      RAISE EXCEPTION 'Valid employee is required';
    END IF;
  ELSE
    IF v_role <> 'customer' THEN
      RAISE EXCEPTION 'Customer access required';
    END IF;

    IF p_customer_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = p_customer_id
        AND c.cafe_id = p_cafe_id
        AND c.profile_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Valid customer is required';
    END IF;

    IF p_table_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.self_order_tokens t
      WHERE t.table_id = p_table_id
        AND t.cafe_id = p_cafe_id
        AND t.is_active = true
    ) THEN
      RAISE EXCEPTION 'Active QR table is required';
    END IF;
  END IF;

  IF p_table_id IS NOT NULL THEN
    SELECT ct.label
      INTO v_table_label
    FROM public.cafe_tables ct
    WHERE ct.id = p_table_id
      AND ct.cafe_id = p_cafe_id;

    IF v_table_label IS NULL THEN
      RAISE EXCEPTION 'Table not found';
    END IF;
  END IF;

  DROP TABLE IF EXISTS pg_temp.tmp_order_lines;

  CREATE TEMP TABLE tmp_order_lines (
    product_id UUID,
    product_name TEXT,
    unit_price NUMERIC,
    quantity INTEGER,
    discount NUMERIC,
    tax_rate NUMERIC,
    item_discount NUMERIC,
    taxable NUMERIC,
    tax_amount NUMERIC,
    line_total NUMERIC,
    notes TEXT
  ) ON COMMIT DROP;

  INSERT INTO tmp_order_lines (
    product_id,
    product_name,
    unit_price,
    quantity,
    discount,
    tax_rate,
    item_discount,
    taxable,
    tax_amount,
    line_total,
    notes
  )
  SELECT
    p.id,
    p.name,
    p.price,
    item.quantity,
    p.discount,
    p.tax_rate,
    round((p.price * item.quantity) * (p.discount / 100), 2),
    round((p.price * item.quantity) - ((p.price * item.quantity) * (p.discount / 100)), 2),
    round(((p.price * item.quantity) - ((p.price * item.quantity) * (p.discount / 100))) * (p.tax_rate / 100), 2),
    round(((p.price * item.quantity) - ((p.price * item.quantity) * (p.discount / 100))) * (1 + (p.tax_rate / 100)), 2),
    nullif(trim(item.notes), '')
  FROM jsonb_to_recordset(p_items) AS item(product_id UUID, quantity INTEGER, notes TEXT)
  JOIN public.products p
    ON p.id = item.product_id
   AND p.cafe_id = p_cafe_id
   AND p.is_available = true
  WHERE item.quantity > 0;

  IF NOT EXISTS (SELECT 1 FROM tmp_order_lines) THEN
    RAISE EXCEPTION 'No valid order items found';
  END IF;

  SELECT
    round(sum(unit_price * quantity), 2),
    round(sum(item_discount), 2),
    round(sum(tax_amount), 2),
    round(sum(line_total), 2)
  INTO subtotal, discount_total, tax_total, total
  FROM tmp_order_lines;

  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    SELECT c.id, c.discount_type::text, c.value
      INTO v_coupon_id, v_coupon_discount_type, v_coupon_value
    FROM public.coupons c
    WHERE c.cafe_id = p_cafe_id
      AND c.code = upper(trim(p_coupon_code))
      AND c.is_active = true
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
      AND (c.min_order_amount IS NULL OR subtotal >= c.min_order_amount)
    LIMIT 1;

    IF v_coupon_id IS NULL THEN
      RAISE EXCEPTION 'Coupon is invalid, expired, fully used, or below minimum order amount';
    END IF;

    v_coupon_discount := CASE
      WHEN v_coupon_discount_type = 'percentage' THEN round(subtotal * (v_coupon_value / 100), 2)
      ELSE v_coupon_value
    END;
    v_coupon_discount := least(v_coupon_discount, subtotal - discount_total);
    discount_total := round(discount_total + v_coupon_discount, 2);
    total := round(greatest(total - v_coupon_discount, 0), 2);
  END IF;

  v_order_number := 'ODF-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad((floor(random() * 1000000))::integer::text, 6, '0');

  INSERT INTO public.orders (
    cafe_id,
    order_number,
    table_id,
    customer_id,
    employee_id,
    status,
    subtotal,
    discount_total,
    tax_total,
    total,
    coupon_code,
    notes,
    source,
    session_id
  )
  VALUES (
    p_cafe_id,
    v_order_number,
    p_table_id,
    p_customer_id,
    p_employee_id,
    'sent_to_kitchen',
    subtotal,
    discount_total,
    tax_total,
    total,
    nullif(upper(trim(p_coupon_code)), ''),
    nullif(trim(p_notes), ''),
    p_source,
    p_session_id
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    cafe_id,
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    discount,
    tax_rate,
    line_total,
    notes
  )
  SELECT
    p_cafe_id,
    v_order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    discount,
    tax_rate,
    line_total,
    notes
  FROM tmp_order_lines;

  INSERT INTO public.kitchen_tickets (
    cafe_id,
    order_id,
    order_number,
    table_label,
    stage,
    priority
  )
  VALUES (
    p_cafe_id,
    v_order_id,
    v_order_number,
    v_table_label,
    'to_cook',
    CASE WHEN p_source = 'self_order' THEN 1 ELSE 0 END
  )
  RETURNING id INTO v_ticket_id;

  INSERT INTO public.kitchen_ticket_items (
    cafe_id,
    ticket_id,
    product_name,
    quantity,
    notes
  )
  SELECT
    p_cafe_id,
    v_ticket_id,
    product_name,
    quantity,
    notes
  FROM tmp_order_lines;

  IF p_table_id IS NOT NULL THEN
    UPDATE public.cafe_tables
    SET status = 'occupied'
    WHERE id = p_table_id
      AND cafe_id = p_cafe_id;
  END IF;

  IF v_coupon_id IS NOT NULL THEN
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = v_coupon_id;
  END IF;

  order_id := v_order_id;
  order_number := v_order_number;
  ticket_id := v_ticket_id;
  RETURN NEXT;
END;
$$;

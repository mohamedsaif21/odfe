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

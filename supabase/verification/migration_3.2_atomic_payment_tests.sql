-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 3.2 — ATOMIC PAYMENT TRANSACTION — BEHAVIOURAL TEST SUITE
-- Function under test: public.complete_payment_for_order (phase4_module3)
--
-- WHEN / HOW TO RUN
--   * Run the migration first:
--       supabase/migrations/20260907000000_phase4_module3_atomic_payment.sql
--   * Paste THIS file into the Supabase SQL Editor and run it as an owner /
--     postgres role (the editor runs as postgres by default).
--   * The whole file runs inside one transaction that ends with ROLLBACK.
--     Live data is NEVER modified: every row the tests create or change lives
--     only in this transaction and disappears when it rolls back.
--
-- WHAT THE SUITE CREATES (all rolled back)
--   * 2 throwaway cafes (slug + name generated randomly) and 3 throwaway
--     auth users + profiles (admin/cashier-role temp admin, an intruder admin
--     of a DIFFERENT cafe, and a 'customer'-role user of the temp cafe).
--   * 1 employee, 1 product category, 1 product (price 100, tax 0), 1 inventory
--     item (stock 100), 1 product_ingredient (1 unit per sale), 4 cafe tables,
--     2 customers, and 5 orders (A..E).
--
-- NOTES / ADAPTATION
--   * auth.uid() is emulated with current_setting by writing
--     request.jwt.claims ('{"sub":"<uid>","role":"authenticated"}'), exactly
--     how PostgREST sessions populate it. No real login is needed.
--   * Inserting into auth.users may be blocked on some hosted projects. The
--     minimal-column INSERT below works on standard Supabase auth; if your
--     project's auth schema needs extra NOT NULL columns, extend it here.
--   * gen_random_uuid()/crypt/gen_salt come with pgcrypto, which Supabase has
--     installed. If you run this against a bare PG, CREATE EXTENSION pgcrypto.
--
-- RESULT
--   Each test prints PASSED/FAILED and records a row in temp table __results.
--   The last DO prints a summary. Expect all 12 to pass after applying the
--   migration; then the trailing ROLLBACK discards everything.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Test result ledger + fixture id holder (both dropped at ROLLBACK)
CREATE TEMP TABLE __results (t text PRIMARY KEY, ok boolean, note text) ON COMMIT DROP;
CREATE TEMP TABLE __fix (k text PRIMARY KEY, v uuid) ON COMMIT DROP;

-- ── FIXTURE SETUP ───────────────────────────────────────────────────────────
DO $$
DECLARE
  v_ts text := to_char(now(), 'YYYYMMDDHH24MISS');
  v_rand text := substr(md5(random()::text), 1, 8);
  v_cafe_id uuid := gen_random_uuid();
  v_cafe2_id uuid := gen_random_uuid();
  v_admin_uid uuid := gen_random_uuid();
  v_intruder_uid uuid := gen_random_uuid();
  v_customer_role_uid uuid := gen_random_uuid();
  v_employee_id uuid := gen_random_uuid();
  v_cat_id uuid := gen_random_uuid();
  v_prod_id uuid := gen_random_uuid();
  v_item_id uuid := gen_random_uuid();
  v_t1 uuid := gen_random_uuid();
  v_t2 uuid := gen_random_uuid();
  v_t3 uuid := gen_random_uuid();
  v_t4 uuid := gen_random_uuid();
  v_cust_a uuid := gen_random_uuid();
  v_cust_b uuid := gen_random_uuid();
  v_order_a uuid;
  v_order_b uuid;
  v_order_c uuid;
  v_order_d uuid;
  v_order_e uuid;
  v_admin_email text := 'migration-' || v_ts || '-' || v_rand || '-admin@migtest.local';
  v_intruder_email text := 'migration-' || v_ts || '-' || v_rand || '-intruder@migtest.local';
  v_customer_email text := 'migration-' || v_ts || '-' || v_rand || '-customer@migtest.local';
BEGIN
  INSERT INTO __fix VALUES
    ('cafe', v_cafe_id), ('cafe2', v_cafe2_id),
    ('admin', v_admin_uid), ('intruder', v_intruder_uid), ('customer_role', v_customer_role_uid),
    ('employee', v_employee_id), ('product', v_prod_id), ('item', v_item_id),
    ('t1', v_t1), ('t2', v_t2), ('t3', v_t3), ('t4', v_t4),
    ('cust_a', v_cust_a), ('cust_b', v_cust_b);

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_admin_uid, 'authenticated', 'authenticated', v_admin_email, crypt('mig3-test', gen_salt('bf')), now(), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_intruder_uid, 'authenticated', 'authenticated', v_intruder_email, crypt('mig3-test', gen_salt('bf')), now(), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_customer_role_uid, 'authenticated', 'authenticated', v_customer_email, crypt('mig3-test', gen_salt('bf')), now(), now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.cafes (id, owner_id, name, slug)
  VALUES
    (
      v_cafe_id,
      v_admin_uid,
      'Migration Test Cafe ' || v_rand,
      'migration-test-' || v_ts || '-' || v_rand
    ),
    (
      v_cafe2_id,
      v_intruder_uid,
      'Migration Intruder Cafe ' || v_rand,
      'migration-intruder-' || v_ts || '-' || v_rand
    );

  INSERT INTO public.profiles (id, cafe_id, role, full_name, email, is_active)
  VALUES
    (v_admin_uid, v_cafe_id, 'admin', 'Migration Admin', v_admin_email, true),
    (v_intruder_uid, v_cafe2_id, 'admin', 'Migration Intruder', v_intruder_email, true),
    (v_customer_role_uid, v_cafe_id, 'customer', 'Migration Customer Role', v_customer_email, true)
  ON CONFLICT (id) DO UPDATE
  SET
    cafe_id = EXCLUDED.cafe_id,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active;

  INSERT INTO public.employees (id, cafe_id, profile_id, role)
  VALUES (
    v_employee_id,
    v_cafe_id,
    v_admin_uid,
    'admin'
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    cafe_id = EXCLUDED.cafe_id,
    role = EXCLUDED.role
  RETURNING id INTO v_employee_id;

  INSERT INTO public.product_categories (id, cafe_id, name, sort_order, is_active)
  VALUES (v_cat_id, v_cafe_id, 'Migration Tests', 0, true);

  INSERT INTO public.products (id, cafe_id, category_id, name, price, tax_rate, discount, is_available, sort_order)
  VALUES (v_prod_id, v_cafe_id, v_cat_id, 'Migration Brew', 100, 0, 0, true, 0);

  INSERT INTO public.inventory_items (id, cafe_id, name, unit, cost_per_unit, stock, minimum_stock, is_active)
  VALUES (v_item_id, v_cafe_id, 'Migration Beans', 'g', 10, 100, 5, true);

  INSERT INTO public.product_ingredients (
    cafe_id,
    product_id,
    inventory_item_id,
    quantity
  )
  VALUES (
    v_cafe_id,
    v_prod_id,
    v_item_id,
    1
  );

  INSERT INTO public.cafe_tables (id, cafe_id, floor_id, label, seats, status)
  VALUES
    (v_t1, v_cafe_id, NULL, 'MigT1', 2, 'occupied'),
    (v_t2, v_cafe_id, NULL, 'MigT2', 2, 'occupied'),
    (v_t3, v_cafe_id, NULL, 'MigT3', 2, 'occupied'),
    (v_t4, v_cafe_id, NULL, 'MigT4', 2, 'occupied');

  INSERT INTO public.customers (
    id,
    cafe_id,
    profile_id,
    name,
    phone,
    loyalty_points,
    total_points_earned,
    tier_id,
    referral_code,
    referred_by,
    wallet_balance
  )
  VALUES
    (
      v_cust_a,
      v_cafe_id,
      NULL,
      'Mig Customer A',
      '9000000001',
      0,
      0,
      NULL,
      NULL,
      NULL,
      0
    ),
    (
      v_cust_b,
      v_cafe_id,
      NULL,
      'Mig Customer B',
      '9000000002',
      0,
      0,
      NULL,
      NULL,
      NULL,
      0
    );

  INSERT INTO public.orders (cafe_id, order_number, table_id, customer_id, employee_id, status, subtotal, discount_total, tax_total, total, coupon_code, notes, source, session_id)
  VALUES
    (v_cafe_id, 'MIG3-A-' || v_ts, v_t1, v_cust_a, v_employee_id, 'sent_to_kitchen', 200.00, 0.00, 0.00, 200.00, NULL, NULL, 'pos', NULL),
    (v_cafe_id, 'MIG3-B-' || v_ts, v_t2, v_cust_b, v_employee_id, 'sent_to_kitchen', 200.00, 0.00, 0.00, 200.00, NULL, NULL, 'pos', NULL),
    (v_cafe_id, 'MIG3-C-' || v_ts, v_t3, v_cust_a, v_employee_id, 'sent_to_kitchen', 200.00, 0.00, 0.00, 200.00, NULL, NULL, 'pos', NULL),
    (v_cafe_id, 'MIG3-D-' || v_ts, v_t4, v_cust_a, v_employee_id, 'sent_to_kitchen', 20000.00, 0.00, 0.00, 20000.00, NULL, NULL, 'pos', NULL),
    (v_cafe_id, 'MIG3-E-' || v_ts, NULL, NULL, v_employee_id, 'cancelled', 100.00, 0.00, 0.00, 100.00, NULL, NULL, 'pos', NULL);

  SELECT id INTO v_order_a FROM public.orders WHERE order_number = 'MIG3-A-' || v_ts;
  SELECT id INTO v_order_b FROM public.orders WHERE order_number = 'MIG3-B-' || v_ts;
  SELECT id INTO v_order_c FROM public.orders WHERE order_number = 'MIG3-C-' || v_ts;
  SELECT id INTO v_order_d FROM public.orders WHERE order_number = 'MIG3-D-' || v_ts;
  SELECT id INTO v_order_e FROM public.orders WHERE order_number = 'MIG3-E-' || v_ts;

  INSERT INTO __fix VALUES
    ('order_a', v_order_a), ('order_b', v_order_b), ('order_c', v_order_c),
    ('order_d', v_order_d), ('order_e', v_order_e);

  INSERT INTO public.order_items (cafe_id, order_id, product_id, product_name, unit_price, quantity, discount, tax_rate, line_total, notes)
  VALUES
    (v_cafe_id, v_order_a, v_prod_id, 'Migration Brew', 100.00, 2, 0.00, 0.00, 200.00, NULL),
    (v_cafe_id, v_order_b, v_prod_id, 'Migration Brew', 100.00, 2, 0.00, 0.00, 200.00, NULL),
    (v_cafe_id, v_order_c, v_prod_id, 'Migration Brew', 100.00, 2, 0.00, 0.00, 200.00, NULL),
    (v_cafe_id, v_order_d, v_prod_id, 'Migration Brew', 100.00, 200, 0.00, 0.00, 20000.00, NULL),
    (v_cafe_id, v_order_e, v_prod_id, 'Migration Brew', 100.00, 1, 0.00, 0.00, 100.00, NULL);

  RAISE NOTICE 'Fixture ready: cafe %, orders %/%/%/%/%', v_cafe_id, v_order_a, v_order_b, v_order_c, v_order_d, v_order_e;
END
$$;

-- T1 – Preconditions: function exists; fixture has no completed payments, correct
-- totals, stock 100, all four tables occupied.
DO $$
DECLARE
  v_total numeric;
  v_cnt integer;
  v_stock numeric;
  v_t4_status text;
  v_ok boolean;
  v_note text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'admin')), true);

  SELECT count(*) INTO v_cnt
  FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name = 'complete_payment_for_order';
  v_ok := v_cnt = 1;
  IF NOT v_ok THEN v_note := v_note || 'function missing; '; END IF;

  SELECT count(*) INTO v_cnt FROM public.payments WHERE cafe_id = (SELECT v FROM __fix WHERE k = 'cafe');
  IF v_cnt = 0 THEN v_note := v_note || 'no payments; '; ELSE v_ok := false; v_note := v_note || 'existing payments; '; END IF;

  SELECT total INTO v_total FROM public.orders WHERE id = (SELECT v FROM __fix WHERE k = 'order_a');
  IF v_total = 200 THEN v_note := v_note || 'order_a total 200; '; ELSE v_ok := false; v_note := v_note || 'order_a total ' || v_total || '; '; END IF;

  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  IF v_stock = 100 THEN v_note := v_note || 'stock 100; '; ELSE v_ok := false; v_note := v_note || 'stock ' || v_stock || '; '; END IF;

  SELECT status INTO v_t4_status FROM public.cafe_tables WHERE id = (SELECT v FROM __fix WHERE k = 't4');
  IF v_t4_status = 'occupied' THEN v_note := v_note || 't4 occupied; '; ELSE v_ok := false; v_note := v_note || 't4 ' || v_t4_status || '; '; END IF;

  INSERT INTO __results VALUES ('T1 preconditions', v_ok, v_note);
  IF v_ok THEN RAISE NOTICE 'T1 PASSED: %', v_note;
  ELSE RAISE NOTICE 'T1 FAILED: %', v_note; END IF;
END
$$;

-- T2 – Partial payment (order A): returns fully_paid=false, paid_total=60,
-- order NOT paid, table NOT freed, stock NOT deducted, no loyalty yet.
DO $$
DECLARE
  v_res record;
  v_order_status text;
  v_table_status text;
  v_stock numeric;
  v_stock_before numeric;
  v_points integer;
  v_ok boolean := true;
  v_note text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'admin')), true);

  SELECT stock INTO v_stock_before FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');

  SELECT * INTO v_res FROM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_a'), 'cash', 60);

  IF v_res.fully_paid = false AND v_res.paid_total = 60 AND v_res.order_total = 200 AND v_res.status = 'completed' AND v_res.payment_id IS NOT NULL
  THEN v_note := v_note || 'result row ok; '; ELSE v_ok := false; v_note := v_note || 'result ' || v_res.fully_paid || '/' || v_res.paid_total || '; '; END IF;

  SELECT status INTO v_order_status FROM public.orders WHERE id = (SELECT v FROM __fix WHERE k = 'order_a');
  IF v_order_status = 'sent_to_kitchen' THEN v_note := v_note || 'order not paid; '; ELSE v_ok := false; v_note := v_note || 'order ' || v_order_status || '; '; END IF;

  SELECT status INTO v_table_status FROM public.cafe_tables WHERE id = (SELECT v FROM __fix WHERE k = 't1');
  IF v_table_status = 'occupied' THEN v_note := v_note || 'table held; '; ELSE v_ok := false; v_note := v_note || 'table ' || v_table_status || '; '; END IF;

  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  IF v_stock = v_stock_before THEN v_note := v_note || 'stock held (0 deducted); '; ELSE v_ok := false; v_note := v_note || 'stock ' || v_stock_before || '->' || v_stock || '; '; END IF;

  SELECT loyalty_points INTO v_points FROM public.customers WHERE id = (SELECT v FROM __fix WHERE k = 'cust_a');
  IF v_points = 0 THEN v_note := v_note || 'no loyalty; '; ELSE v_ok := false; v_note := v_note || 'points ' || v_points || '; '; END IF;

  INSERT INTO __results VALUES ('T2 partial payment', v_ok, v_note);
  IF v_ok THEN RAISE NOTICE 'T2 PASSED: %', v_note;
  ELSE RAISE NOTICE 'T2 FAILED: %', v_note; END IF;
END
$$;

-- T3 – Completion payment (order A, 140): fully_paid=true, paid_total=200,
-- order 'paid', table freed, stock 100->98 with an 'out' movement, loyalty +4
-- (floor(200/50)) with a reward_redemptions row.
DO $$
DECLARE
  v_res record;
  v_order_status text;
  v_table_status text;
  v_stock numeric;
  v_stock_before numeric;
  v_points integer;
  v_mov_cnt integer;
  v_red_cnt integer;
  v_ok boolean := true;
  v_note text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'admin')), true);

  SELECT stock INTO v_stock_before FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');

  SELECT * INTO v_res FROM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_a'), 'cash', 140);

  IF v_res.fully_paid = true AND v_res.paid_total = 200 THEN v_note := v_note || 'result ok; '; ELSE v_ok := false; v_note := v_note || 'result ' || v_res.fully_paid || '/' || v_res.paid_total || '; '; END IF;

  SELECT status INTO v_order_status FROM public.orders WHERE id = (SELECT v FROM __fix WHERE k = 'order_a');
  IF v_order_status = 'paid' THEN v_note := v_note || 'paid; '; ELSE v_ok := false; v_note := v_note || 'order ' || v_order_status || '; '; END IF;

  SELECT status INTO v_table_status FROM public.cafe_tables WHERE id = (SELECT v FROM __fix WHERE k = 't1');
  IF v_table_status = 'available' THEN v_note := v_note || 'table freed; '; ELSE v_ok := false; v_note := v_note || 'table ' || v_table_status || '; '; END IF;

  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  IF v_stock_before - v_stock = 2 THEN v_note := v_note || 'stock -2; '; ELSE v_ok := false; v_note := v_note || 'stock ' || v_stock_before || '->' || v_stock || '; '; END IF;

  SELECT count(*) INTO v_mov_cnt FROM public.stock_movements
  WHERE cafe_id = (SELECT v FROM __fix WHERE k = 'cafe')
    AND inventory_item_id = (SELECT v FROM __fix WHERE k = 'item')
    AND movement_type = 'out'
    AND notes = 'Auto-deducted from order ' || (SELECT v FROM __fix WHERE k = 'order_a')::text;
  IF v_mov_cnt = 1 THEN v_note := v_note || 'movement; '; ELSE v_ok := false; v_note := v_note || 'movements ' || v_mov_cnt || '; '; END IF;

  SELECT loyalty_points INTO v_points FROM public.customers WHERE id = (SELECT v FROM __fix WHERE k = 'cust_a');
  IF v_points = 4 THEN v_note := v_note || 'loyalty +4; '; ELSE v_ok := false; v_note := v_note || 'points ' || v_points || '; '; END IF;

  SELECT count(*) INTO v_red_cnt FROM public.reward_redemptions
  WHERE cafe_id = (SELECT v FROM __fix WHERE k = 'cafe') AND order_id = (SELECT v FROM __fix WHERE k = 'order_a') AND reward_type = 'points' AND value = 200;
  IF v_red_cnt = 1 THEN v_note := v_note || 'redemption row; '; ELSE v_ok := false; v_note := v_note || 'redemptions ' || v_red_cnt || '; '; END IF;

  INSERT INTO __results VALUES ('T3 full payment', v_ok, v_note);
  IF v_ok THEN RAISE NOTICE 'T3 PASSED: %', v_note;
  ELSE RAISE NOTICE 'T3 FAILED: %', v_note; END IF;
END
$$;

-- T4 – Duplicate payment on an already-paid order (order A): rejected, and no
-- third payment row appears.
DO $$
DECLARE
  v_err text;
  v_cnt integer;
  v_ok boolean := false;
  v_note text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'admin')), true);

  BEGIN
    PERFORM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_a'), 'cash', 1);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('current status' in v_err) > 0;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments
  WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_a') AND cafe_id = (SELECT v FROM __fix WHERE k = 'cafe');
  IF v_cnt <> 2 THEN v_ok := false; v_note := v_note || 'payment rows ' || v_cnt || '; '; END IF;

  INSERT INTO __results VALUES ('T4 duplicate on paid', v_ok, coalesce(v_err, v_note));
  IF v_ok THEN RAISE NOTICE 'T4 PASSED: %', coalesce(v_err, '');
  ELSE RAISE NOTICE 'T4 FAILED: %', coalesce(v_err, 'no error', v_note); END IF;
END
$$;

-- T5 – Split tender on order B (80 then 120): first call partial (table stays
-- occupied, no stock), second completes (order paid, table freed, stock -2,
-- loyalty +4 for customer B).
DO $$
DECLARE
  v_res record;
  v_order_status text;
  v_table_status text;
  v_stock numeric;
  v_stock_before numeric;
  v_points integer;
  v_pay_cnt integer;
  v_pay_sum numeric;
  v_ok boolean := true;
  v_note text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'admin')), true);

  SELECT stock INTO v_stock_before FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');

  SELECT * INTO v_res FROM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_b'), 'cash', 80);
  -- first leg must NOT have completed anything
  SELECT status INTO v_order_status FROM public.orders WHERE id = (SELECT v FROM __fix WHERE k = 'order_b');
  SELECT status INTO v_table_status FROM public.cafe_tables WHERE id = (SELECT v FROM __fix WHERE k = 't2');
  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  IF v_res.fully_paid = false AND v_order_status <> 'paid' AND v_table_status = 'occupied' AND v_stock = v_stock_before
  THEN v_note := v_note || 'leg1 held; '; ELSE v_ok := false; v_note := v_note || 'leg1 ' || v_res.fully_paid || '/' || v_order_status || '/' || v_table_status || '/' || v_stock || '; '; END IF;

  SELECT * INTO v_res FROM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_b'), 'cash', 120);

  SELECT status INTO v_order_status FROM public.orders WHERE id = (SELECT v FROM __fix WHERE k = 'order_b');
  SELECT status INTO v_table_status FROM public.cafe_tables WHERE id = (SELECT v FROM __fix WHERE k = 't2');
  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  SELECT loyalty_points INTO v_points FROM public.customers WHERE id = (SELECT v FROM __fix WHERE k = 'cust_b');
  SELECT count(*), coalesce(sum(amount), 0) INTO v_pay_cnt, v_pay_sum FROM public.payments
  WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_b') AND cafe_id = (SELECT v FROM __fix WHERE k = 'cafe');

  IF v_res.fully_paid = true AND v_order_status = 'paid' AND v_table_status = 'available'
     AND v_stock = v_stock_before - 2 AND v_points = 4 AND v_pay_cnt = 2 AND v_pay_sum = 200
  THEN v_note := v_note || 'leg2 completed; '; ELSE v_ok := false; v_note := v_note || 'leg2 ' || v_res.fully_paid || '/' || v_order_status || '/' || v_table_status || '/' || v_stock || '/' || v_points || '/' || v_pay_cnt || '/' || v_pay_sum || '; '; END IF;

  INSERT INTO __results VALUES ('T5 split tender', v_ok, v_note);
  IF v_ok THEN RAISE NOTICE 'T5 PASSED: %', v_note;
  ELSE RAISE NOTICE 'T5 FAILED: %', v_note; END IF;
END
$$;

-- T6 – Overpayment on order C (250 when 200 owed): rejected and fully rolled
-- back (no payment row, order/table/stock/loyalty untouched).
DO $$
DECLARE
  v_err text;
  v_cnt integer;
  v_order_status text;
  v_table_status text;
  v_stock numeric;
  v_stock_before numeric;
  v_points integer;
  v_ok boolean := false;
  v_note text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'admin')), true);

  SELECT stock INTO v_stock_before FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');

  BEGIN
    PERFORM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_c'), 'cash', 250);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('remaining balance' in v_err) > 0;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_c');
  SELECT status INTO v_order_status FROM public.orders WHERE id = (SELECT v FROM __fix WHERE k = 'order_c');
  SELECT status INTO v_table_status FROM public.cafe_tables WHERE id = (SELECT v FROM __fix WHERE k = 't3');
  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  SELECT loyalty_points INTO v_points FROM public.customers WHERE id = (SELECT v FROM __fix WHERE k = 'cust_a');

  IF v_ok AND v_cnt = 0 AND v_order_status = 'sent_to_kitchen' AND v_table_status = 'occupied' AND v_stock = v_stock_before AND v_points = 4
  THEN v_note := 'rollback verified';
  ELSE v_ok := false; v_note := v_note || ' state ' || v_cnt || '/' || v_order_status || '/' || v_table_status || '/' || v_stock || '/' || v_points; END IF;

  INSERT INTO __results VALUES ('T6 overpayment', v_ok, coalesce(v_err, v_note));
  IF v_ok THEN RAISE NOTICE 'T6 PASSED: %', v_err;
  ELSE RAISE NOTICE 'T6 FAILED: %', coalesce(v_err, v_note, 'no error'); END IF;
END
$$;

-- T7 – Insufficient stock (order D needs 200 units, only 100 on hand): the
-- payment is fully rolled back — no payment row, order not paid, table held,
-- stock unchanged, no loyalty, no movements.
DO $$
DECLARE
  v_err text;
  v_cnt integer;
  v_order_status text;
  v_table_status text;
  v_stock numeric;
  v_stock_before numeric;
  v_points integer;
  v_mov_cnt integer;
  v_ok boolean := false;
  v_note text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'admin')), true);

  SELECT stock INTO v_stock_before FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');

  BEGIN
    PERFORM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_d'), 'cash', 20000);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('Insufficient stock' in v_err) > 0;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_d');
  SELECT status INTO v_order_status FROM public.orders WHERE id = (SELECT v FROM __fix WHERE k = 'order_d');
  SELECT status INTO v_table_status FROM public.cafe_tables WHERE id = (SELECT v FROM __fix WHERE k = 't4');
  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  SELECT loyalty_points INTO v_points FROM public.customers WHERE id = (SELECT v FROM __fix WHERE k = 'cust_a');
  SELECT count(*) INTO v_mov_cnt FROM public.stock_movements
  WHERE cafe_id = (SELECT v FROM __fix WHERE k = 'cafe')
    AND notes = 'Auto-deducted from order ' || (SELECT v FROM __fix WHERE k = 'order_d')::text;

  IF v_ok AND v_cnt = 0 AND v_order_status = 'sent_to_kitchen' AND v_table_status = 'occupied' AND v_stock = v_stock_before AND v_points = 4 AND v_mov_cnt = 0
  THEN v_note := 'rollback verified';
  ELSE v_ok := false; v_note := v_note || ' state ' || v_cnt || '/' || v_order_status || '/' || v_table_status || '/' || v_stock || '/' || v_points || '/' || v_mov_cnt; END IF;

  INSERT INTO __results VALUES ('T7 insufficient stock', v_ok, coalesce(v_err, v_note));
  IF v_ok THEN RAISE NOTICE 'T7 PASSED: %', v_err;
  ELSE RAISE NOTICE 'T7 FAILED: %', coalesce(v_err, v_note, 'no error'); END IF;
END
$$;

-- T8 – Wrong cafe: an admin profile of ANOTHER cafe cannot pay this cafe's order.
DO $$
DECLARE
  v_err text;
  v_cnt integer;
  v_ok boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'intruder')), true);

  BEGIN
    PERFORM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_c'), 'cash', 100);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('Cafe access denied' in v_err) > 0;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_c');

  IF NOT (v_ok AND v_cnt = 0) THEN v_ok := false; v_err := coalesce(v_err, 'no error') || ' (payments ' || v_cnt || ')'; END IF;

  INSERT INTO __results VALUES ('T8 wrong cafe', v_ok, coalesce(v_err, ''));
  IF v_ok THEN RAISE NOTICE 'T8 PASSED: %', v_err;
  ELSE RAISE NOTICE 'T8 FAILED: %', v_err; END IF;
END
$$;

-- T9 – Non-POS role: a 'customer' profile cannot run the payment RPC.
DO $$
DECLARE
  v_err text;
  v_cnt integer;
  v_ok boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'customer_role')), true);

  BEGIN
    PERFORM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_c'), 'cash', 100);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('Admin or cashier access required' in v_err) > 0;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_c');
  IF NOT (v_ok AND v_cnt = 0) THEN v_ok := false; v_err := coalesce(v_err, 'no error') || ' (payments ' || v_cnt || ')'; END IF;

  INSERT INTO __results VALUES ('T9 non-POS role', v_ok, coalesce(v_err, ''));
  IF v_ok THEN RAISE NOTICE 'T9 PASSED: %', v_err;
  ELSE RAISE NOTICE 'T9 FAILED: %', v_err; END IF;
END
$$;

-- T10 – Invalid methods / missing references (order C, payable). Each must fail
-- with a specific message and leave zero payment rows.
DO $$
DECLARE
  v_err text;
  v_ok boolean := true;
  v_cnt integer;
  v_note text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'admin')), true);

  BEGIN
    PERFORM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_c'), 'bitcoin', 50);
    v_ok := false; v_note := v_note || 'bitcoin accepted; ';
  EXCEPTION WHEN others THEN
    IF position('Invalid payment method' in SQLERRM) = 0 THEN v_ok := false; v_note := v_note || 'bitcoin msg; '; END IF;
  END;

  BEGIN
    PERFORM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_c'), 'split', 50);
    v_ok := false; v_note := v_note || 'split accepted; ';
  EXCEPTION WHEN others THEN
    IF position('Split payments' in SQLERRM) = 0 THEN v_ok := false; v_note := v_note || 'split msg; '; END IF;
  END;

  BEGIN
    PERFORM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_c'), 'card', 50, NULL);
    v_ok := false; v_note := v_note || 'card-no-ref accepted; ';
  EXCEPTION WHEN others THEN
    IF position('require a reference' in SQLERRM) = 0 THEN v_ok := false; v_note := v_note || 'card msg; '; END IF;
  END;

  BEGIN
    PERFORM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_c'), 'upi', 50, '  ');
    v_ok := false; v_note := v_note || 'upi-blank-ref accepted; ';
  EXCEPTION WHEN others THEN
    IF position('require a reference' in SQLERRM) = 0 THEN v_ok := false; v_note := v_note || 'upi msg; '; END IF;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_c');
  IF v_cnt <> 0 THEN v_ok := false; v_note := v_note || 'rows ' || v_cnt || '; '; END IF;

  INSERT INTO __results VALUES ('T10 method/reference validation', v_ok, v_note);
  IF v_ok THEN RAISE NOTICE 'T10 PASSED: all rejected';
  ELSE RAISE NOTICE 'T10 FAILED: %', v_note; END IF;
END
$$;

-- T11 – Cancelled order: refused, and no payment row appears.
DO $$
DECLARE
  v_err text;
  v_cnt integer;
  v_ok boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', (SELECT v FROM __fix WHERE k = 'admin')), true);

  BEGIN
    PERFORM public.complete_payment_for_order((SELECT v FROM __fix WHERE k = 'order_e'), 'cash', 100);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('current status' in v_err) > 0;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_e');
  IF NOT (v_ok AND v_cnt = 0) THEN v_ok := false; v_err := coalesce(v_err, 'no error') || ' (payments ' || v_cnt || ')'; END IF;

  INSERT INTO __results VALUES ('T11 cancelled order', v_ok, coalesce(v_err, ''));
  IF v_ok THEN RAISE NOTICE 'T11 PASSED: %', v_err;
  ELSE RAISE NOTICE 'T11 FAILED: %', v_err; END IF;
END
$$;

-- T12 – Side-effect sweep: after every failure path, the fixture is unchanged
-- (atomicity invariant). This verifies post-failure invariants only; a genuine
-- concurrent two-session test of the FOR UPDATE serialization is deferred to a
-- later migration.
DO $$
DECLARE
  v_ok boolean := true;
  v_note text := '';
  v_c numeric;
  v_d numeric;
  v_e numeric;
  v_stock numeric;
  v_pa integer;
  v_pb integer;
  v_t3 text;
  v_t4 text;
  v_status_c text;
  v_status_d text;
  v_status_e text;
BEGIN
  SELECT count(*) INTO v_c FROM public.payments WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_c');
  SELECT count(*) INTO v_d FROM public.payments WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_d');
  SELECT count(*) INTO v_e FROM public.payments WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_e');
  IF v_c = 0 AND v_d = 0 AND v_e = 0 THEN v_note := v_note || 'no failed payments; '; ELSE v_ok := false; END IF;

  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  IF v_stock = 96 THEN v_note := v_note || 'stock 96 (only A+B deducted); '; ELSE v_ok := false; v_note := v_note || 'stock ' || v_stock || '; '; END IF;

  SELECT loyalty_points INTO v_pa FROM public.customers WHERE id = (SELECT v FROM __fix WHERE k = 'cust_a');
  SELECT loyalty_points INTO v_pb FROM public.customers WHERE id = (SELECT v FROM __fix WHERE k = 'cust_b');
  IF v_pa = 4 AND v_pb = 4 THEN v_note := v_note || 'loyalty only A+B; '; ELSE v_ok := false; v_note := v_note || 'points ' || v_pa || '/' || v_pb || '; '; END IF;

  SELECT status INTO v_t3 FROM public.cafe_tables WHERE id = (SELECT v FROM __fix WHERE k = 't3');
  SELECT status INTO v_t4 FROM public.cafe_tables WHERE id = (SELECT v FROM __fix WHERE k = 't4');
  IF v_t3 = 'occupied' AND v_t4 = 'occupied' THEN v_note := v_note || 'tables held; '; ELSE v_ok := false; v_note := v_note || 'tables ' || v_t3 || '/' || v_t4 || '; '; END IF;

  SELECT status INTO v_status_c FROM public.orders WHERE id = (SELECT v FROM __fix WHERE k = 'order_c');
  SELECT status INTO v_status_d FROM public.orders WHERE id = (SELECT v FROM __fix WHERE k = 'order_d');
  SELECT status INTO v_status_e FROM public.orders WHERE id = (SELECT v FROM __fix WHERE k = 'order_e');
  IF v_status_c = 'sent_to_kitchen' AND v_status_d = 'sent_to_kitchen' AND v_status_e = 'cancelled'
  THEN v_note := v_note || 'order statuses intact; '; ELSE v_ok := false; v_note := v_note || 'statuses ' || v_status_c || '/' || v_status_d || '/' || v_status_e || '; '; END IF;

  INSERT INTO __results VALUES ('T12 side-effect sweep', v_ok, v_note);
  IF v_ok THEN RAISE NOTICE 'T12 PASSED: %', v_note;
  ELSE RAISE NOTICE 'T12 FAILED: %', v_note; END IF;
END
$$;

-- ── SUMMARY ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_total integer;
  v_pass integer;
  v_fail integer;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE ok), count(*) FILTER (WHERE NOT ok)
    INTO v_total, v_pass, v_fail
  FROM __results;

  RAISE NOTICE 'SUMMARY: % tests, % passed, % failed', v_total, v_pass, v_fail;
  IF v_fail > 0 THEN
    RAISE NOTICE 'FAILED TESTS: %', (SELECT string_agg(t, ', ') FROM __results WHERE NOT ok);
  END IF;
END
$$;

-- Nothing below this line is ever persisted: this whole session rolls back.
ROLLBACK;

SELECT 'ROLLED BACK. Live data untouched.' AS status;
-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 3.2 — ATOMIC PAYMENT — CLEAN VERIFICATION SUITE
-- Function under test: public.complete_payment_for_order
--
-- WORKFLOW (two explicit sections in THIS file)
--
-- SECTION A — TEST EXECUTION (lines below; ends at the T1-T12 result SELECT)
--   1. Paste SECTION A into the Supabase SQL Editor and run it as owner.
--   2. Inspect the T1..T12 result grid (this is the FINAL statement that
--      returns a grid, so it is the one the editor shows).
--
-- SECTION B — CLEANUP (commented block at the very bottom of this file)
--   3. After inspecting the results, run SECTION B separately:
--        ROLLBACK;
--      then run the cleanup-verification query from the commented block.
--   4. Cleanup must show:
--        MIG-3.2 cafe_tables remaining | 0 | CLEAN
--        Production T-01                | T-01 / occupied | OK
--
-- Why two sections?
--   The Supabase SQL Editor only keeps the LAST result grid of a run. If the
--   cleanup SELECT followed the results in the same execution, it would hide
--   the T1-T12 grid. Keeping ROLLBACK + cleanup as an explicitly separate
--   step preserves both the visible results AND rollback safety.
--
-- LIVE-SCHEMA COLUMN NAMES (verified — never reference the stale names)
--   product_ingredients : inventory_item_id  (NOT item_id)
--   stock_movements     : inventory_item_id, movement_type, notes (NOT item_id/type/note)
--   inventory_items     : stock              (NOT current_stock)
--   cafe_tables         : id, cafe_id, label, seats, status, floor_id — NO updated_at
--   customers           : NO is_active, NO visit_count
--
-- FIXTURE (all created ONLY inside SECTION A's transaction)
--   2 cafes, 3 auth users, 2 customers, 1 product, 1 inventory item,
--   1 product_ingredient, 4 cafe tables (MIG-3.2-T1..T4), 5 orders,
--   5 order_items. The production table T-01 is NEVER touched.
--
-- EXPECTED: T1..T12 PASS, TOTAL 12, PASSED 12, FAILED 0, OVERALL PASS.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION A — TEST EXECUTION
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Result ledger + fixture ID store (ON COMMIT DROP cleans them via ROLLBACK)
CREATE TEMP TABLE __results (
  test_id   text PRIMARY KEY,
  test_name text NOT NULL,
  ok        boolean NOT NULL,
  note      text
) ON COMMIT DROP;

CREATE TEMP TABLE __fix (
  k text PRIMARY KEY,
  v uuid
) ON COMMIT DROP;

-- ═══ FIXTURE SETUP ═════════════════════════════════════════════════════════
DO $$
DECLARE
  v_cafe_id         uuid := gen_random_uuid();
  v_intruder_cafe   uuid := gen_random_uuid();
  v_admin_uid       uuid := gen_random_uuid();
  v_intruder_uid    uuid := gen_random_uuid();
  v_cust_role_uid   uuid := gen_random_uuid();
  v_employee_id     uuid := gen_random_uuid();
  v_cat_id          uuid := gen_random_uuid();
  v_prod_id         uuid := gen_random_uuid();
  v_item_id         uuid := gen_random_uuid();
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
  v_ts   text := to_char(now(), 'YYYYMMDDHH24MISS');
  v_rand text := substr(md5(random()::text), 1, 8);
  v_admin_email   text := 'mig32-' || v_ts || '-' || v_rand || '-admin@test.local';
  v_intruder_email text := 'mig32-' || v_ts || '-' || v_rand || '-intruder@test.local';
  v_cust_email    text := 'mig32-' || v_ts || '-' || v_rand || '-customer@test.local';
BEGIN
  -- Store all fixture IDs for retrieval in test blocks
  INSERT INTO __fix VALUES
    ('cafe', v_cafe_id), ('intruder_cafe', v_intruder_cafe),
    ('admin', v_admin_uid), ('intruder', v_intruder_uid),
    ('customer_role', v_cust_role_uid),
    ('employee', v_employee_id), ('product', v_prod_id), ('item', v_item_id),
    ('t1', v_t1), ('t2', v_t2), ('t3', v_t3), ('t4', v_t4),
    ('cust_a', v_cust_a), ('cust_b', v_cust_b);

  -- ── Step 1: Create auth users ───────────────────────────────────────────
  -- handle_new_user() trigger fires, creates profiles + employees bound to
  -- the oldest cafe (which at this point may be a trigger-created Default
  -- Cafe or a pre-existing production cafe). We reconcile below.
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password,
     email_confirmed_at, created_at, updated_at)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_admin_uid,
     'authenticated', 'authenticated', v_admin_email,
     crypt('mig32-test', gen_salt('bf')), now(), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_intruder_uid,
     'authenticated', 'authenticated', v_intruder_email,
     crypt('mig32-test', gen_salt('bf')), now(), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_cust_role_uid,
     'authenticated', 'authenticated', v_cust_email,
     crypt('mig32-test', gen_salt('bf')), now(), now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ── Step 2: Create test cafes ───────────────────────────────────────────
  -- owner_id is NOT NULL and must reference an existing auth.users row, so it
  -- must use the temporary auth UUIDs created in Step 1 (never NULL, never a
  -- production user). Main cafe -> v_admin_uid, intruder cafe -> v_intruder_uid.
  INSERT INTO public.cafes (id, name, slug, owner_id, created_at)
  VALUES
    (v_cafe_id, 'Mig32 Test Cafe', 'mig32-test-' || v_rand, v_admin_uid,
     '2000-01-01 00:00:00+00'),
    (v_intruder_cafe, 'Mig32 Intruder Cafe', 'mig32-intruder-' || v_rand,
     v_intruder_uid, now());

  -- ── Step 3: Reconcile profiles to correct cafes / roles ─────────────────
  -- ON CONFLICT handles the trigger-created profile rows.
  INSERT INTO public.profiles (id, cafe_id, role, full_name, email, is_active)
  VALUES
    (v_admin_uid,     v_cafe_id,        'admin',    'Mig32 Admin',    v_admin_email,   true),
    (v_intruder_uid,  v_intruder_cafe,  'admin',    'Mig32 Intruder', v_intruder_email, true),
    (v_cust_role_uid, v_cafe_id,        'customer', 'Mig32 Customer', v_cust_email,    true)
  ON CONFLICT (id) DO UPDATE
  SET cafe_id  = EXCLUDED.cafe_id,
      role     = EXCLUDED.role,
      email    = EXCLUDED.email,
      is_active = EXCLUDED.is_active;

  -- ── Step 4: Reconcile employees to correct cafes / roles ────────────────
  INSERT INTO public.employees (id, cafe_id, profile_id, role)
  VALUES (v_employee_id, v_cafe_id, v_admin_uid, 'admin')
  ON CONFLICT (profile_id) DO UPDATE
  SET cafe_id = EXCLUDED.cafe_id,
      role    = EXCLUDED.role
  RETURNING id INTO v_employee_id;

  UPDATE public.employees
     SET cafe_id = v_intruder_cafe, role = 'admin'
   WHERE profile_id = v_intruder_uid;

  UPDATE public.employees
     SET cafe_id = v_cafe_id, role = 'customer'
   WHERE profile_id = v_cust_role_uid;

  -- ── Step 5: Customers ───────────────────────────────────────────────────
  INSERT INTO public.customers
    (id, cafe_id, name, phone, loyalty_points, total_points_earned)
  VALUES
    (v_cust_a, v_cafe_id, 'Mig32 Cust A', '9000000001', 0, 0),
    (v_cust_b, v_cafe_id, 'Mig32 Cust B', '9000000002', 0, 0);

  -- ── Step 6: Category, product, inventory, recipe ────────────────────────
  INSERT INTO public.product_categories (id, cafe_id, name, sort_order, is_active)
  VALUES (v_cat_id, v_cafe_id, 'Mig32 Cat', 0, true);

  INSERT INTO public.products
    (id, cafe_id, category_id, name, price, tax_rate, discount, is_available, sort_order)
  VALUES (v_prod_id, v_cafe_id, v_cat_id, 'Mig32 Brew', 100, 0, 0, true, 0);

  INSERT INTO public.inventory_items
    (id, cafe_id, name, unit, cost_per_unit, stock, minimum_stock, is_active)
  VALUES (v_item_id, v_cafe_id, 'Mig32 Beans', 'g', 10, 100, 5, true);

  INSERT INTO public.product_ingredients (cafe_id, product_id, inventory_item_id, quantity)
  VALUES (v_cafe_id, v_prod_id, v_item_id, 1);

  -- ── Step 7: Four cafe tables ────────────────────────────────────────────
  INSERT INTO public.cafe_tables (id, cafe_id, label, seats, status)
  VALUES
    (v_t1, v_cafe_id, 'MIG-3.2-T1', 2, 'occupied'),
    (v_t2, v_cafe_id, 'MIG-3.2-T2', 2, 'occupied'),
    (v_t3, v_cafe_id, 'MIG-3.2-T3', 2, 'occupied'),
    (v_t4, v_cafe_id, 'MIG-3.2-T4', 2, 'occupied');

  -- ── Step 8: Orders ──────────────────────────────────────────────────────
  -- A: total 200  (T1/T2/T3 — partial, final, duplicate tests)
  -- B: total 200  (T4 — two-leg)
  -- C: total 250  (T5/T7/T8/T9/T10 — overpayment + rejection tests)
  -- D: total 20000, 200 items (T6 — insufficient stock)
  -- E: total 100, cancelled   (T11)
  INSERT INTO public.orders
    (cafe_id, order_number, table_id, customer_id, employee_id,
     status, subtotal, discount_total, tax_total, total, source)
  VALUES
    (v_cafe_id, 'MIG32-A-'||v_ts, v_t1, v_cust_a, v_employee_id,
     'sent_to_kitchen', 200, 0, 0, 200, 'pos'),
    (v_cafe_id, 'MIG32-B-'||v_ts, v_t2, v_cust_b, v_employee_id,
     'sent_to_kitchen', 200, 0, 0, 200, 'pos'),
    (v_cafe_id, 'MIG32-C-'||v_ts, v_t3, v_cust_a, v_employee_id,
     'sent_to_kitchen', 250, 0, 0, 250, 'pos'),
    (v_cafe_id, 'MIG32-D-'||v_ts, v_t4, v_cust_a, v_employee_id,
     'sent_to_kitchen', 20000, 0, 0, 20000, 'pos'),
    (v_cafe_id, 'MIG32-E-'||v_ts, NULL, NULL, v_employee_id,
     'cancelled', 100, 0, 0, 100, 'pos');

  SELECT id INTO v_order_a FROM public.orders WHERE order_number = 'MIG32-A-'||v_ts;
  SELECT id INTO v_order_b FROM public.orders WHERE order_number = 'MIG32-B-'||v_ts;
  SELECT id INTO v_order_c FROM public.orders WHERE order_number = 'MIG32-C-'||v_ts;
  SELECT id INTO v_order_d FROM public.orders WHERE order_number = 'MIG32-D-'||v_ts;
  SELECT id INTO v_order_e FROM public.orders WHERE order_number = 'MIG32-E-'||v_ts;

  INSERT INTO __fix VALUES
    ('order_a', v_order_a), ('order_b', v_order_b), ('order_c', v_order_c),
    ('order_d', v_order_d), ('order_e', v_order_e);

  -- ── Step 9: Order items ─────────────────────────────────────────────────
  INSERT INTO public.order_items
    (cafe_id, order_id, product_id, product_name, unit_price, quantity,
     discount, tax_rate, line_total)
  VALUES
    (v_cafe_id, v_order_a, v_prod_id, 'Mig32 Brew', 100, 2, 0, 0, 200),
    (v_cafe_id, v_order_b, v_prod_id, 'Mig32 Brew', 100, 2, 0, 0, 200),
    (v_cafe_id, v_order_c, v_prod_id, 'Mig32 Brew', 125, 2, 0, 0, 250),
    (v_cafe_id, v_order_d, v_prod_id, 'Mig32 Brew', 100, 200, 0, 0, 20000),
    (v_cafe_id, v_order_e, v_prod_id, 'Mig32 Brew', 100, 1, 0, 0, 100);

  RAISE NOTICE 'Fixture ready: cafe=% orders A=% B=% C=% D=% E=%',
    v_cafe_id, v_order_a, v_order_b, v_order_c, v_order_d, v_order_e;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'FIXTURE SETUP FAILED [%]: %', SQLSTATE, SQLERRM;
  INSERT INTO __results VALUES
    ('SETUP', 'Fixture setup', false, format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T1 — PARTIAL PAYMENT
-- Pay 60 on order A (total 200). Order stays unpaid, table stays occupied,
-- inventory unchanged, loyalty unchanged.
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_res          record;
  v_order_status text;
  v_table_status text;
  v_stock        numeric;
  v_points       integer;
  v_ok           boolean := true;
  v_note         text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'admin')), true);

  SELECT stock INTO v_stock FROM public.inventory_items
   WHERE id = (SELECT v FROM __fix WHERE k = 'item');

  SELECT * INTO v_res
    FROM public.complete_payment_for_order(
           (SELECT v FROM __fix WHERE k = 'order_a'), 'cash', 60);

  -- Assert RPC result
  IF v_res.fully_paid = false
     AND v_res.paid_total = 60
     AND v_res.order_total = 200
     AND v_res.status = 'completed'
     AND v_res.payment_id IS NOT NULL
  THEN v_note := v_note || 'result ok; ';
  ELSE v_ok := false;
       v_note := v_note || 'result fp='||v_res.fully_paid
                             ||' pt='||v_res.paid_total||'; ';
  END IF;

  -- Order unchanged
  SELECT status INTO v_order_status FROM public.orders
   WHERE id = (SELECT v FROM __fix WHERE k = 'order_a');
  IF v_order_status = 'sent_to_kitchen'
  THEN v_note := v_note || 'order held; ';
  ELSE v_ok := false; v_note := v_note || 'order='||v_order_status||'; ';
  END IF;

  -- Table held
  SELECT status INTO v_table_status FROM public.cafe_tables
   WHERE id = (SELECT v FROM __fix WHERE k = 't1');
  IF v_table_status = 'occupied'
  THEN v_note := v_note || 'table held; ';
  ELSE v_ok := false; v_note := v_note || 'table='||v_table_status||'; ';
  END IF;

  -- Inventory unchanged
  SELECT stock INTO v_stock FROM public.inventory_items
   WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  IF v_stock = 100
  THEN v_note := v_note || 'stock held; ';
  ELSE v_ok := false; v_note := v_note || 'stock='||v_stock||'; ';
  END IF;

  -- Loyalty unchanged
  SELECT loyalty_points INTO v_points FROM public.customers
   WHERE id = (SELECT v FROM __fix WHERE k = 'cust_a');
  IF v_points = 0
  THEN v_note := v_note || 'loyalty held; ';
  ELSE v_ok := false; v_note := v_note || 'loyalty='||v_points||'; ';
  END IF;

  INSERT INTO __results VALUES ('T1', 'Partial payment', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T1', 'Partial payment', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T2 — FINAL PAYMENT
-- Pay remaining 140 on order A. Order becomes paid, table freed, inventory
-- deducted (2 units), loyalty earned (floor(200/50)=4 points).
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_res          record;
  v_order_status text;
  v_table_status text;
  v_stock        numeric;
  v_points       integer;
  v_mov_cnt      integer;
  v_red_cnt      integer;
  v_pay_cnt      integer;
  v_ok           boolean := true;
  v_note         text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'admin')), true);

  SELECT * INTO v_res
    FROM public.complete_payment_for_order(
           (SELECT v FROM __fix WHERE k = 'order_a'), 'cash', 140);

  IF v_res.fully_paid = true AND v_res.paid_total = 200
  THEN v_note := v_note || 'result ok; ';
  ELSE v_ok := false;
       v_note := v_note || 'result fp='||v_res.fully_paid
                             ||' pt='||v_res.paid_total||'; ';
  END IF;

  -- Order paid
  SELECT status INTO v_order_status FROM public.orders
   WHERE id = (SELECT v FROM __fix WHERE k = 'order_a');
  IF v_order_status = 'paid'
  THEN v_note := v_note || 'order paid; ';
  ELSE v_ok := false; v_note := v_note || 'order='||v_order_status||'; ';
  END IF;

  -- Table freed
  SELECT status INTO v_table_status FROM public.cafe_tables
   WHERE id = (SELECT v FROM __fix WHERE k = 't1');
  IF v_table_status = 'available'
  THEN v_note := v_note || 'table freed; ';
  ELSE v_ok := false; v_note := v_note || 'table='||v_table_status||'; ';
  END IF;

  -- Inventory deducted by 2
  SELECT stock INTO v_stock FROM public.inventory_items
   WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  IF v_stock = 98
  THEN v_note := v_note || 'stock 98; ';
  ELSE v_ok := false; v_note := v_note || 'stock='||v_stock||'; ';
  END IF;

  -- Stock movement recorded
  SELECT count(*) INTO v_mov_cnt FROM public.stock_movements
   WHERE cafe_id = (SELECT v FROM __fix WHERE k = 'cafe')
     AND inventory_item_id = (SELECT v FROM __fix WHERE k = 'item')
     AND movement_type = 'out'
     AND notes = 'Auto-deducted from order '
                 || (SELECT v FROM __fix WHERE k = 'order_a')::text;
  IF v_mov_cnt = 1
  THEN v_note := v_note || 'movement ok; ';
  ELSE v_ok := false; v_note := v_note || 'movements='||v_mov_cnt||'; ';
  END IF;

  -- Loyalty = 4
  SELECT loyalty_points INTO v_points FROM public.customers
   WHERE id = (SELECT v FROM __fix WHERE k = 'cust_a');
  IF v_points = 4
  THEN v_note := v_note || 'loyalty 4; ';
  ELSE v_ok := false; v_note := v_note || 'loyalty='||v_points||'; ';
  END IF;

  -- Reward redemption row
  SELECT count(*) INTO v_red_cnt FROM public.reward_redemptions
   WHERE cafe_id = (SELECT v FROM __fix WHERE k = 'cafe')
     AND order_id = (SELECT v FROM __fix WHERE k = 'order_a')
     AND reward_type = 'points';
  IF v_red_cnt = 1
  THEN v_note := v_note || 'redemption ok; ';
  ELSE v_ok := false; v_note := v_note || 'redemptions='||v_red_cnt||'; ';
  END IF;

  -- Exactly 2 payment rows, sum = 200
  SELECT count(*) INTO v_pay_cnt FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_a')
     AND cafe_id = (SELECT v FROM __fix WHERE k = 'cafe')
     AND status = 'completed';
  IF v_pay_cnt = 2
  THEN v_note := v_note || '2 payments; ';
  ELSE v_ok := false; v_note := v_note || 'payments='||v_pay_cnt||'; ';
  END IF;

  INSERT INTO __results VALUES ('T2', 'Final payment', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T2', 'Final payment', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T3 — DUPLICATE / FINALIZED ORDER PROTECTION
-- Attempt payment on the already-paid order A. Must be rejected.
-- No additional payment row, no inventory, no loyalty.
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_err   text;
  v_cnt   integer;
  v_ok    boolean := false;
  v_note  text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'admin')), true);

  BEGIN
    PERFORM public.complete_payment_for_order(
               (SELECT v FROM __fix WHERE k = 'order_a'), 'cash', 1);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('current status' in v_err) > 0;
    IF NOT v_ok THEN v_note := 'wrong error: ' || v_err; END IF;
  END;

  -- Still exactly 2 payment rows
  SELECT count(*) INTO v_cnt FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_a')
     AND cafe_id = (SELECT v FROM __fix WHERE k = 'cafe');
  IF v_cnt <> 2
  THEN v_ok := false; v_note := v_note || 'payments='||v_cnt; END IF;

  IF v_ok THEN v_note := 'rejected, no extra row'; END IF;

  INSERT INTO __results VALUES ('T3', 'Duplicate/finalized order protection', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T3', 'Duplicate/finalized order protection', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T4 — TWO-LEG PAYMENT
-- Pay order B (total 200) in two legs: 80 then 120.
-- Leg 1: partial — order unpaid, table held, inventory held.
-- Leg 2: completes — order paid, table freed, inventory -2, loyalty +4.
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_res          record;
  v_order_status text;
  v_table_status text;
  v_stock        numeric;
  v_stock_before numeric;
  v_points       integer;
  v_pay_cnt      integer;
  v_pay_sum      numeric;
  v_ok           boolean := true;
  v_note         text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'admin')), true);

  SELECT stock INTO v_stock_before FROM public.inventory_items
   WHERE id = (SELECT v FROM __fix WHERE k = 'item');

  -- Leg 1: 80
  SELECT * INTO v_res
    FROM public.complete_payment_for_order(
           (SELECT v FROM __fix WHERE k = 'order_b'), 'cash', 80);

  SELECT status INTO v_order_status FROM public.orders
   WHERE id = (SELECT v FROM __fix WHERE k = 'order_b');
  SELECT status INTO v_table_status FROM public.cafe_tables
   WHERE id = (SELECT v FROM __fix WHERE k = 't2');
  SELECT stock INTO v_stock FROM public.inventory_items
   WHERE id = (SELECT v FROM __fix WHERE k = 'item');

  IF v_res.fully_paid = false
     AND v_order_status <> 'paid'
     AND v_table_status = 'occupied'
     AND v_stock = v_stock_before
  THEN v_note := 'leg1 held; ';
  ELSE v_ok := false;
       v_note := 'leg1 fp='||v_res.fully_paid
                    ||' os='||v_order_status
                    ||' ts='||v_table_status
                    ||' st='||v_stock||'; ';
  END IF;

  -- Leg 2: 120
  SELECT * INTO v_res
    FROM public.complete_payment_for_order(
           (SELECT v FROM __fix WHERE k = 'order_b'), 'cash', 120);

  SELECT status INTO v_order_status FROM public.orders
   WHERE id = (SELECT v FROM __fix WHERE k = 'order_b');
  SELECT status INTO v_table_status FROM public.cafe_tables
   WHERE id = (SELECT v FROM __fix WHERE k = 't2');
  SELECT stock INTO v_stock FROM public.inventory_items
   WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  SELECT loyalty_points INTO v_points FROM public.customers
   WHERE id = (SELECT v FROM __fix WHERE k = 'cust_b');
  SELECT count(*), coalesce(sum(amount), 0) INTO v_pay_cnt, v_pay_sum
    FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_b')
     AND cafe_id = (SELECT v FROM __fix WHERE k = 'cafe')
     AND status = 'completed';

  IF v_res.fully_paid = true
     AND v_order_status = 'paid'
     AND v_table_status = 'available'
     AND v_stock = v_stock_before - 2
     AND v_points = 4
     AND v_pay_cnt = 2
     AND v_pay_sum = 200
  THEN v_note := v_note || 'leg2 completed; ';
  ELSE v_ok := false;
       v_note := v_note || 'leg2 fp='||v_res.fully_paid
                    ||' os='||v_order_status
                    ||' ts='||v_table_status
                    ||' st='||v_stock
                    ||' pt='||v_points
                    ||' pc='||v_pay_cnt
                    ||' ps='||v_pay_sum||'; ';
  END IF;

  INSERT INTO __results VALUES ('T4', 'Two-leg payment', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T4', 'Two-leg payment', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T5 — OVERPAYMENT
-- Order C total 250. Attempt 251. Must be rejected. Full rollback.
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_err          text;
  v_cnt          integer;
  v_order_status text;
  v_table_status text;
  v_stock        numeric;
  v_points       integer;
  v_ok           boolean := false;
  v_note         text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'admin')), true);

  BEGIN
    PERFORM public.complete_payment_for_order(
               (SELECT v FROM __fix WHERE k = 'order_c'), 'cash', 251);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('remaining balance' in v_err) > 0;
    IF NOT v_ok THEN v_note := 'wrong error: ' || v_err; END IF;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_c');
  SELECT status INTO v_order_status FROM public.orders
   WHERE id = (SELECT v FROM __fix WHERE k = 'order_c');
  SELECT status INTO v_table_status FROM public.cafe_tables
   WHERE id = (SELECT v FROM __fix WHERE k = 't3');
  SELECT stock INTO v_stock FROM public.inventory_items
   WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  SELECT loyalty_points INTO v_points FROM public.customers
   WHERE id = (SELECT v FROM __fix WHERE k = 'cust_a');

  IF v_ok
     AND v_cnt = 0
     AND v_order_status = 'sent_to_kitchen'
     AND v_table_status = 'occupied'
     AND v_stock = 96
     AND v_points = 4
  THEN v_note := 'rejected, rollback verified';
  ELSE v_ok := false;
       v_note := v_note || ' state payments='||v_cnt
                    ||' os='||v_order_status
                    ||' ts='||v_table_status
                    ||' st='||v_stock
                    ||' pt='||v_points;
  END IF;

  INSERT INTO __results VALUES ('T5', 'Overpayment', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T5', 'Overpayment', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T6 — INSUFFICIENT INVENTORY
-- Order D: 200 items x 1 unit = 200 units needed, only 96 on hand (after T2+T4).
-- Must be rejected. Payment row rolled back. Inventory unchanged.
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_err          text;
  v_cnt          integer;
  v_order_status text;
  v_table_status text;
  v_stock        numeric;
  v_points       integer;
  v_mov_cnt      integer;
  v_ok           boolean := false;
  v_note         text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'admin')), true);

  BEGIN
    PERFORM public.complete_payment_for_order(
               (SELECT v FROM __fix WHERE k = 'order_d'), 'cash', 20000);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('Insufficient stock' in v_err) > 0;
    IF NOT v_ok THEN v_note := 'wrong error: ' || v_err; END IF;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_d');
  SELECT status INTO v_order_status FROM public.orders
   WHERE id = (SELECT v FROM __fix WHERE k = 'order_d');
  SELECT status INTO v_table_status FROM public.cafe_tables
   WHERE id = (SELECT v FROM __fix WHERE k = 't4');
  SELECT stock INTO v_stock FROM public.inventory_items
   WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  SELECT loyalty_points INTO v_points FROM public.customers
   WHERE id = (SELECT v FROM __fix WHERE k = 'cust_a');
  SELECT count(*) INTO v_mov_cnt FROM public.stock_movements
   WHERE cafe_id = (SELECT v FROM __fix WHERE k = 'cafe')
     AND notes = 'Auto-deducted from order '
                 || (SELECT v FROM __fix WHERE k = 'order_d')::text;

  IF v_ok
     AND v_cnt = 0
     AND v_order_status = 'sent_to_kitchen'
     AND v_table_status = 'occupied'
     AND v_stock = 96
     AND v_points = 4
     AND v_mov_cnt = 0
  THEN v_note := 'rejected, rollback verified';
  ELSE v_ok := false;
       v_note := v_note || ' state payments='||v_cnt
                    ||' os='||v_order_status
                    ||' ts='||v_table_status
                    ||' st='||v_stock
                    ||' pt='||v_points
                    ||' mov='||v_mov_cnt;
  END IF;

  INSERT INTO __results VALUES ('T6', 'Insufficient inventory', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T6', 'Insufficient inventory', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T7 — WRONG CAFE
-- Intruder admin (belongs to intruder_cafe) attempts to pay order C
-- (belongs to test cafe). Must be rejected with "Cafe access denied".
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_err  text;
  v_cnt  integer;
  v_ok   boolean := false;
  v_note text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'intruder')), true);

  BEGIN
    PERFORM public.complete_payment_for_order(
               (SELECT v FROM __fix WHERE k = 'order_c'), 'cash', 100);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('Cafe access denied' in v_err) > 0;
    IF NOT v_ok THEN v_note := 'wrong error: ' || v_err; END IF;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_c')
     AND cafe_id = (SELECT v FROM __fix WHERE k = 'cafe');

  IF v_ok AND v_cnt = 0
  THEN v_note := 'rejected, no side effects';
  ELSE v_ok := false; v_note := v_note || ' payments='||v_cnt; END IF;

  INSERT INTO __results VALUES ('T7', 'Wrong cafe', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T7', 'Wrong cafe', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T8 — CUSTOMER ROLE
-- Customer-role user attempts payment on order C. Must be rejected:
-- "Admin or cashier access required".
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_err  text;
  v_cnt  integer;
  v_ok   boolean := false;
  v_note text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'customer_role')), true);

  BEGIN
    PERFORM public.complete_payment_for_order(
               (SELECT v FROM __fix WHERE k = 'order_c'), 'cash', 100);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('Admin or cashier access required' in v_err) > 0;
    IF NOT v_ok THEN v_note := 'wrong error: ' || v_err; END IF;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_c')
     AND cafe_id = (SELECT v FROM __fix WHERE k = 'cafe');

  IF v_ok AND v_cnt = 0
  THEN v_note := 'rejected, no side effects';
  ELSE v_ok := false; v_note := v_note || ' payments='||v_cnt; END IF;

  INSERT INTO __results VALUES ('T8', 'Customer role', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T8', 'Customer role', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T9 — INVALID PAYMENT METHOD
-- Test 'bitcoin' (invalid) and 'split' (explicitly rejected).
-- Both must fail. No payment rows created.
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_ok   boolean := true;
  v_cnt  integer;
  v_note text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'admin')), true);

  BEGIN
    PERFORM public.complete_payment_for_order(
               (SELECT v FROM __fix WHERE k = 'order_c'), 'bitcoin', 50);
    v_ok := false; v_note := v_note || 'bitcoin accepted; ';
  EXCEPTION WHEN others THEN
    IF position('Invalid payment method' in SQLERRM) = 0
    THEN v_ok := false; v_note := v_note || 'bitcoin wrong msg; '; END IF;
  END;

  BEGIN
    PERFORM public.complete_payment_for_order(
               (SELECT v FROM __fix WHERE k = 'order_c'), 'split', 50);
    v_ok := false; v_note := v_note || 'split accepted; ';
  EXCEPTION WHEN others THEN
    IF position('Split payments' in SQLERRM) = 0
    THEN v_ok := false; v_note := v_note || 'split wrong msg; '; END IF;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_c')
     AND cafe_id = (SELECT v FROM __fix WHERE k = 'cafe');
  IF v_cnt <> 0
  THEN v_ok := false; v_note := v_note || 'payments='||v_cnt; END IF;

  IF v_ok THEN v_note := 'both rejected, no rows'; END IF;

  INSERT INTO __results VALUES ('T9', 'Invalid payment method', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T9', 'Invalid payment method', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T10 — CARD / UPI REFERENCE VALIDATION
-- card without reference, upi with blank reference. Both must fail.
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_ok   boolean := true;
  v_cnt  integer;
  v_note text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'admin')), true);

  BEGIN
    PERFORM public.complete_payment_for_order(
               (SELECT v FROM __fix WHERE k = 'order_c'), 'card', 50, NULL);
    v_ok := false; v_note := v_note || 'card-no-ref accepted; ';
  EXCEPTION WHEN others THEN
    IF position('require a reference' in SQLERRM) = 0
    THEN v_ok := false; v_note := v_note || 'card wrong msg; '; END IF;
  END;

  BEGIN
    PERFORM public.complete_payment_for_order(
               (SELECT v FROM __fix WHERE k = 'order_c'), 'upi', 50, '  ');
    v_ok := false; v_note := v_note || 'upi-blank-ref accepted; ';
  EXCEPTION WHEN others THEN
    IF position('require a reference' in SQLERRM) = 0
    THEN v_ok := false; v_note := v_note || 'upi wrong msg; '; END IF;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_c')
     AND cafe_id = (SELECT v FROM __fix WHERE k = 'cafe');
  IF v_cnt <> 0
  THEN v_ok := false; v_note := v_note || 'payments='||v_cnt; END IF;

  IF v_ok THEN v_note := 'both rejected, no rows'; END IF;

  INSERT INTO __results VALUES ('T10', 'Card/UPI reference validation', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T10', 'Card/UPI reference validation', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T11 — CANCELLED ORDER
-- Order E is cancelled. Payment must be rejected. No side effects.
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_err  text;
  v_cnt  integer;
  v_ok   boolean := false;
  v_note text    := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}',
           (SELECT v FROM __fix WHERE k = 'admin')), true);

  BEGIN
    PERFORM public.complete_payment_for_order(
               (SELECT v FROM __fix WHERE k = 'order_e'), 'cash', 100);
  EXCEPTION WHEN others THEN
    v_err := SQLERRM;
    v_ok := position('current status' in v_err) > 0;
    IF NOT v_ok THEN v_note := 'wrong error: ' || v_err; END IF;
  END;

  SELECT count(*) INTO v_cnt FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_e');

  IF v_ok AND v_cnt = 0
  THEN v_note := 'rejected, no side effects';
  ELSE v_ok := false; v_note := v_note || ' payments='||v_cnt; END IF;

  INSERT INTO __results VALUES ('T11', 'Cancelled order', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T11', 'Cancelled order', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- T12 — FINAL CONSISTENCY SWEEP
-- Verify all cumulative invariants after every test above.
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_ok   boolean := true;
  v_note text    := '';
  v_n    integer;
  v_s    numeric;
  v_t    text;
  v_pa   integer;
  v_pb   integer;
BEGIN
  -- Orders A, B: paid with 2 payments each, sum 200
  SELECT count(*), coalesce(sum(amount),0) INTO v_n, v_s
    FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_a')
     AND status = 'completed';
  IF v_n = 2 AND v_s = 200
  THEN v_note := v_note || 'A:2/200; ';
  ELSE v_ok := false; v_note := v_note || 'A:'||v_n||'/'||v_s||'; '; END IF;

  SELECT count(*), coalesce(sum(amount),0) INTO v_n, v_s
    FROM public.payments
   WHERE order_id = (SELECT v FROM __fix WHERE k = 'order_b')
     AND status = 'completed';
  IF v_n = 2 AND v_s = 200
  THEN v_note := v_note || 'B:2/200; ';
  ELSE v_ok := false; v_note := v_note || 'B:'||v_n||'/'||v_s||'; '; END IF;

  -- Orders C, D, E: zero payments
  SELECT count(*) INTO v_n FROM public.payments
   WHERE order_id IN (
     (SELECT v FROM __fix WHERE k = 'order_c'),
     (SELECT v FROM __fix WHERE k = 'order_d'),
     (SELECT v FROM __fix WHERE k = 'order_e'));
  IF v_n = 0
  THEN v_note := v_note || 'CDE:0 pay; ';
  ELSE v_ok := false; v_note := v_note || 'CDE:'||v_n||'; '; END IF;

  -- Order statuses
  SELECT status INTO v_t FROM public.orders
   WHERE id = (SELECT v FROM __fix WHERE k = 'order_c');
  IF v_t = 'sent_to_kitchen' THEN v_note := v_note || 'C sent; ';
  ELSE v_ok := false; v_note := v_note || 'C:'||v_t||'; '; END IF;

  SELECT status INTO v_t FROM public.orders
   WHERE id = (SELECT v FROM __fix WHERE k = 'order_d');
  IF v_t = 'sent_to_kitchen' THEN v_note := v_note || 'D sent; ';
  ELSE v_ok := false; v_note := v_note || 'D:'||v_t||'; '; END IF;

  SELECT status INTO v_t FROM public.orders
   WHERE id = (SELECT v FROM __fix WHERE k = 'order_e');
  IF v_t = 'cancelled' THEN v_note := v_note || 'E cancel; ';
  ELSE v_ok := false; v_note := v_note || 'E:'||v_t||'; '; END IF;

  -- Table statuses
  SELECT status INTO v_t FROM public.cafe_tables
   WHERE id = (SELECT v FROM __fix WHERE k = 't1');
  IF v_t = 'available' THEN v_note := v_note || 'T1 avail; ';
  ELSE v_ok := false; v_note := v_note || 'T1:'||v_t||'; '; END IF;

  SELECT status INTO v_t FROM public.cafe_tables
   WHERE id = (SELECT v FROM __fix WHERE k = 't2');
  IF v_t = 'available' THEN v_note := v_note || 'T2 avail; ';
  ELSE v_ok := false; v_note := v_note || 'T2:'||v_t||'; '; END IF;

  SELECT status INTO v_t FROM public.cafe_tables
   WHERE id = (SELECT v FROM __fix WHERE k = 't3');
  IF v_t = 'occupied' THEN v_note := v_note || 'T3 occ; ';
  ELSE v_ok := false; v_note := v_note || 'T3:'||v_t||'; '; END IF;

  SELECT status INTO v_t FROM public.cafe_tables
   WHERE id = (SELECT v FROM __fix WHERE k = 't4');
  IF v_t = 'occupied' THEN v_note := v_note || 'T4 occ; ';
  ELSE v_ok := false; v_note := v_note || 'T4:'||v_t||'; '; END IF;

  -- Inventory: 100 - 2(A) - 2(B) = 96
  SELECT stock INTO v_s FROM public.inventory_items
   WHERE id = (SELECT v FROM __fix WHERE k = 'item');
  IF v_s = 96 THEN v_note := v_note || 'stock 96; ';
  ELSE v_ok := false; v_note := v_note || 'stock='||v_s||'; '; END IF;

  -- Loyalty
  SELECT loyalty_points INTO v_pa FROM public.customers
   WHERE id = (SELECT v FROM __fix WHERE k = 'cust_a');
  SELECT loyalty_points INTO v_pb FROM public.customers
   WHERE id = (SELECT v FROM __fix WHERE k = 'cust_b');
  IF v_pa = 4 AND v_pb = 4
  THEN v_note := v_note || 'loyalty A=4 B=4; ';
  ELSE v_ok := false; v_note := v_note || 'loyalty A='||v_pa||' B='||v_pb||'; ';
  END IF;

  -- No duplicate stock movements (exactly 2 total, one per order)
  SELECT count(*) INTO v_n FROM public.stock_movements
   WHERE cafe_id = (SELECT v FROM __fix WHERE k = 'cafe')
     AND movement_type = 'out';
  IF v_n = 2
  THEN v_note := v_note || '2 movements; ';
  ELSE v_ok := false; v_note := v_note || 'movements='||v_n||'; '; END IF;

  -- All four temporary fixture tables exist inside the transaction
  SELECT count(*) INTO v_n FROM public.cafe_tables
   WHERE label LIKE 'MIG-3.2-%';
  IF v_n = 4
  THEN v_note := v_note || '4 MIG-3.2 tables; ';
  ELSE v_ok := false; v_note := v_note || 'mig-tables='||v_n||'; '; END IF;

  -- Production T-01 untouched: still present and occupied
  SELECT count(*) INTO v_n
    FROM public.cafe_tables
   WHERE label = 'T-01' AND status = 'occupied';
  IF v_n = 1
  THEN v_note := v_note || 'T-01 occupied; ';
  ELSE v_ok := false; v_note := v_note || 'T-01:'||v_n||'; '; END IF;

  INSERT INTO __results VALUES ('T12', 'Final consistency sweep', v_ok, v_note);
EXCEPTION WHEN others THEN
  INSERT INTO __results VALUES ('T12', 'Final consistency sweep', false,
    format('ERROR [%s]: %s', SQLSTATE, SQLERRM));
END
$$;

-- ═══ RESULTS ══════════════════════════════════════════════════════════════════
-- Single, clean 4-column result set: test_id | test_name | status | details,
-- followed by separator and summary totals. The CTE carries a numeric sort key
-- so T12 sorts after T11 (lexicographic ordering would not).
WITH r AS (
  SELECT test_id,
         test_name,
         CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS status,
         coalesce(note, '') AS details,
         CASE WHEN test_id ~ '^T[0-9]+$'
              THEN substr(test_id, 2)::int
              ELSE 98 END        AS _ord,
         0                       AS _sub
  FROM   __results

  UNION ALL
  SELECT '--------------------------------------------------------------',
         '', '', '', 99, 0

  UNION ALL
  SELECT 'TOTAL',  count(*)::text,                       '', '', 99, 1 FROM __results
  UNION ALL
  SELECT 'PASSED', count(*) FILTER (WHERE ok)::text,     '', '', 99, 2 FROM __results
  UNION ALL
  SELECT 'FAILED', count(*) FILTER (WHERE NOT ok)::text, '', '', 99, 3 FROM __results
  UNION ALL
  SELECT 'OVERALL',
         CASE WHEN count(*) FILTER (WHERE NOT ok) = 0
              THEN 'PASS' ELSE 'FAIL' END,
         '', '', 99, 4
  FROM __results
)
SELECT test_id, test_name, status, details
FROM   r
ORDER  BY _ord, _sub;

-- ════════════════════════════════════════════════════════════════════════════
-- END OF SECTION A — TEST EXECUTION
-- The T1..T12 result SELECT above is the FINAL statement of SECTION A.
-- Run SECTION A, inspect the grid, THEN run SECTION B below separately.
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION B — CLEANUP  (run SEPARATELY, after inspecting SECTION A)
--
-- Step 1 — roll back the whole SECTION A transaction (removes every test
-- fixture: cafes, auth users, profiles, employees, customers, products,
-- inventory, tables, orders, payments, movements). Nothing persists.
--
--     ROLLBACK;
--
-- Step 2 — cleanup verification. Must show:
--     MIG-3.2 cafe_tables remaining | 0 | CLEAN
--     Production T-01                | T-01 / occupied | OK
--
--     SELECT 'MIG-3.2 cafe_tables remaining' AS check_name,
--            count(*)::text AS "count",
--            CASE WHEN count(*) = 0 THEN 'CLEAN' ELSE 'LEAK' END AS status
--     FROM public.cafe_tables
--     WHERE label LIKE 'MIG-3.2-%'
--
--     UNION ALL
--
--     SELECT 'Production T-01',
--            label || ' / ' || status,
--            CASE WHEN label = 'T-01' AND status = 'occupied'
--                 THEN 'OK' ELSE 'MODIFIED' END
--     FROM public.cafe_tables
--     WHERE label = 'T-01';
--
-- NOTE: ROLLBACK is intentionally NOT in SECTION A. If it ran in the same
-- execution it would still be safe (it emits no result grid, so the T1-T12
-- grid would stay visible), but the explicit two-step workflow above keeps
-- results and rollback independent and deterministic. If the connection is
-- closed without running SECTION B, PostgreSQL discards the uncommitted
-- transaction anyway — no test fixture can ever persist.
-- ════════════════════════════════════════════════════════════════════════════

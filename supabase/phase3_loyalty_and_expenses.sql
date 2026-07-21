-- ════════════════════════════════════════════════════════════════════════════
-- Phase 3 — Loyalty & Expense Management
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Part A: Loyalty Tiers ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  min_points      INTEGER NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  benefits        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_cafe ON loyalty_tiers(cafe_id);

ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_tiers' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON loyalty_tiers
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

-- Add tier_id and loyalty fields to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_points_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier_id);
CREATE INDEX IF NOT EXISTS idx_customers_referral_code ON customers(referral_code);

-- ─── Part B: Wallet Transactions ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id       UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount        DECIMAL(10,2) NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  reference     TEXT,
  description   TEXT,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_customer ON wallet_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_cafe ON wallet_transactions(cafe_id);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallet_transactions' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON wallet_transactions
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

-- ─── Part C: Referral Codes ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id       UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  used_count    INTEGER NOT NULL DEFAULT 0,
  reward_given  DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cafe_id, code)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_customer ON referral_codes(customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_cafe ON referral_codes(cafe_id);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referral_codes' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON referral_codes
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

-- ─── Part D: Reward Redemptions ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id       UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  reward_type   TEXT NOT NULL CHECK (reward_type IN ('points', 'wallet', 'birthday', 'referral', 'tier_discount')),
  points_used   INTEGER NOT NULL DEFAULT 0,
  value         DECIMAL(10,2) NOT NULL DEFAULT 0,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_customer ON reward_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_order ON reward_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_cafe ON reward_redemptions(cafe_id);

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reward_redemptions' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON reward_redemptions
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

-- ─── Part E: Expense Categories ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expense_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id       UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_cafe ON expense_categories(cafe_id);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expense_categories' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON expense_categories
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

-- ─── Part F: Expenses ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id             UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  category_id         UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  amount              DECIMAL(10,2) NOT NULL,
  description         TEXT NOT NULL,
  expense_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring        BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  notes               TEXT,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_cafe ON expenses(cafe_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'cafe_scoped_all') THEN
    CREATE POLICY "cafe_scoped_all" ON expenses
      FOR ALL USING (cafe_id = auth_cafe_id()) WITH CHECK (cafe_id = auth_cafe_id());
  END IF;
END;
$$;

-- ─── Part G: Auto-update timestamps ────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_loyalty_tiers_updated ON loyalty_tiers;
CREATE TRIGGER trg_loyalty_tiers_updated
  BEFORE UPDATE ON loyalty_tiers
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

DROP TRIGGER IF EXISTS trg_expense_categories_updated ON expense_categories;
CREATE TRIGGER trg_expense_categories_updated
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

DROP TRIGGER IF EXISTS trg_expenses_updated ON expenses;
CREATE TRIGGER trg_expenses_updated
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

-- ─── Part H: RPC — Earn Loyalty Points ─────────────────────────────────────

CREATE OR REPLACE FUNCTION earn_loyalty_points(
  p_customer_id UUID,
  p_cafe_id UUID,
  p_order_id UUID,
  p_amount DECIMAL,
  p_profile_id UUID
)
RETURNS void
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_points INTEGER;
  v_tier_id UUID;
BEGIN
  -- 1 point per ₹50 spent
  v_points := FLOOR(p_amount / 50)::INTEGER;
  IF v_points <= 0 THEN RETURN; END IF;

  -- Update customer points
  UPDATE customers
  SET
    loyalty_points = loyalty_points + v_points,
    total_points_earned = total_points_earned + v_points
  WHERE id = p_customer_id AND cafe_id = p_cafe_id;

  -- Auto-upgrade tier if eligible
  SELECT id INTO v_tier_id FROM loyalty_tiers
    WHERE cafe_id = p_cafe_id AND min_points <= (
      SELECT total_points_earned FROM customers WHERE id = p_customer_id AND cafe_id = p_cafe_id
    )
    AND is_active = true
    ORDER BY min_points DESC
    LIMIT 1;

  IF v_tier_id IS NOT NULL THEN
    UPDATE customers SET tier_id = v_tier_id
    WHERE id = p_customer_id AND cafe_id = p_cafe_id;
  END IF;

  -- Log reward redemption as earning
  INSERT INTO reward_redemptions (cafe_id, customer_id, order_id, reward_type, points_used, value, description)
  VALUES (p_cafe_id, p_customer_id, p_order_id, 'points', v_points, p_amount, 'Points earned from order');
END;
$$;

-- ─── Part I: RPC — Redeem Loyalty Points ───────────────────────────────────

CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_customer_id UUID,
  p_cafe_id UUID,
  p_points INTEGER,
  p_order_id UUID,
  p_profile_id UUID
)
RETURNS DECIMAL
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_current_points INTEGER;
  v_discount DECIMAL;
BEGIN
  -- Check available points
  SELECT loyalty_points INTO v_current_points
  FROM customers WHERE id = p_customer_id AND cafe_id = p_cafe_id;

  IF v_current_points IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF v_current_points < p_points THEN
    RAISE EXCEPTION 'Insufficient points. Available: %, requested: %', v_current_points, p_points;
  END IF;

  -- 1 point = ₹1 discount
  v_discount := p_points::DECIMAL;

  -- Deduct points
  UPDATE customers
  SET loyalty_points = loyalty_points - p_points
  WHERE id = p_customer_id AND cafe_id = p_cafe_id;

  -- Log redemption
  INSERT INTO reward_redemptions (cafe_id, customer_id, order_id, reward_type, points_used, value, description)
  VALUES (p_cafe_id, p_customer_id, p_order_id, 'points', p_points, v_discount, 'Points redeemed for order discount');

  RETURN v_discount;
END;
$$;

-- ─── Part J: RPC — Apply Birthday Reward ───────────────────────────────────

CREATE OR REPLACE FUNCTION apply_birthday_reward(
  p_customer_id UUID,
  p_cafe_id UUID,
  p_order_id UUID,
  p_profile_id UUID
)
RETURNS DECIMAL
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_birthday DATE;
  v_reward DECIMAL := 100; -- ₹100 birthday reward
BEGIN
  SELECT birthday INTO v_birthday
  FROM customers WHERE id = p_customer_id AND cafe_id = p_cafe_id;

  IF v_birthday IS NULL THEN
    RAISE EXCEPTION 'No birthday set for customer';
  END IF;

  IF EXTRACT(MONTH FROM v_birthday) != EXTRACT(MONTH FROM CURRENT_DATE)
     OR EXTRACT(DAY FROM v_birthday) != EXTRACT(DAY FROM CURRENT_DATE) THEN
    RAISE EXCEPTION 'Today is not your birthday';
  END IF;

  -- Log redemption
  INSERT INTO reward_redemptions (cafe_id, customer_id, order_id, reward_type, points_used, value, description)
  VALUES (p_cafe_id, p_customer_id, p_order_id, 'birthday', 0, v_reward, 'Birthday reward applied');

  RETURN v_reward;
END;
$$;

-- ─── Part K: RPC — Apply Referral Reward ───────────────────────────────────

CREATE OR REPLACE FUNCTION apply_referral_reward(
  p_customer_id UUID,
  p_cafe_id UUID,
  p_referral_code TEXT,
  p_profile_id UUID
)
RETURNS DECIMAL
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_referrer_id UUID;
  v_reward DECIMAL := 50; -- ₹50 referral reward
BEGIN
  -- Find the referrer
  SELECT id INTO v_referrer_id
  FROM customers
  WHERE referral_code = p_referral_code AND cafe_id = p_cafe_id AND is_active = true;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  IF v_referrer_id = p_customer_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;

  -- Update referred_by
  UPDATE customers SET referred_by = v_referrer_id
  WHERE id = p_customer_id AND cafe_id = p_cafe_id;

  -- Add reward to referrer wallet
  UPDATE customers
  SET wallet_balance = wallet_balance + v_reward
  WHERE id = v_referrer_id AND cafe_id = p_cafe_id;

  -- Log referral
  INSERT INTO reward_redemptions (cafe_id, customer_id, order_id, reward_type, points_used, value, description)
  VALUES (p_cafe_id, v_referrer_id, NULL, 'referral', 0, v_reward, 'Referral reward for referring a new customer');

  -- Log wallet transaction
  INSERT INTO wallet_transactions (cafe_id, customer_id, amount, type, reference, description, created_by)
  VALUES (p_cafe_id, v_referrer_id, v_reward, 'credit', 'referral', CONCAT('Referral reward for code: ', p_referral_code), p_profile_id);

  RETURN v_reward;
END;
$$;

-- ─── Part L: RPC — Deduct Stock for Order (moved from JS to SQL) ──────────

CREATE OR REPLACE FUNCTION deduct_stock_for_order(
  p_order_id UUID,
  p_cafe_id UUID,
  p_profile_id UUID
)
RETURNS void
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
  v_total_qty DECIMAL;
BEGIN
  FOR v_item IN
    SELECT
      pi.item_id,
      SUM(pi.quantity * oi.quantity) AS total_qty
    FROM order_items oi
    JOIN product_ingredients pi ON pi.product_id = oi.product_id AND pi.cafe_id = p_cafe_id
    WHERE oi.order_id = p_order_id AND oi.cafe_id = p_cafe_id
    GROUP BY pi.item_id
  LOOP
    v_total_qty := v_item.total_qty;

    -- Record stock movement
    INSERT INTO stock_movements (cafe_id, item_id, quantity, type, note, is_wastage, created_by)
    VALUES (p_cafe_id, v_item.item_id, v_total_qty, 'out',
            CONCAT('Auto-deducted from order ', p_order_id), false, p_profile_id);

    -- Adjust stock
    UPDATE inventory_items
    SET stock = GREATEST(0, stock - v_total_qty)
    WHERE id = v_item.item_id AND cafe_id = p_cafe_id;
  END LOOP;
END;
$$;

-- ─── Part M: RPC — Get Profit & Loss Summary ──────────────────────────────

CREATE OR REPLACE FUNCTION get_profit_loss(
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
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_revenue DECIMAL;
  v_expenses DECIMAL;
BEGIN
  -- Total revenue from paid orders
  SELECT COALESCE(SUM(p.amount), 0) INTO v_revenue
  FROM payments p
  JOIN orders o ON o.id = p.order_id AND o.cafe_id = p_cafe_id
  WHERE p.status = 'completed'
    AND p.paid_at::DATE >= p_start_date
    AND p.paid_at::DATE <= p_end_date;

  -- Total expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses
  FROM expenses
  WHERE cafe_id = p_cafe_id
    AND expense_date >= p_start_date
    AND expense_date <= p_end_date;

  RETURN QUERY
  SELECT
    v_revenue AS total_revenue,
    v_expenses AS total_expenses,
    (v_revenue - v_expenses) AS net_profit,
    (
      SELECT COALESCE(json_agg(json_build_object(
        'category', ec.name,
        'total', COALESCE(SUM(e.amount), 0)
      )), '[]'::json)
      FROM expenses e
      JOIN expense_categories ec ON ec.id = e.category_id
      WHERE e.cafe_id = p_cafe_id
        AND e.expense_date >= p_start_date
        AND e.expense_date <= p_end_date
      GROUP BY ec.name
      ORDER BY SUM(e.amount) DESC
    ) AS expense_breakdown;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 20260908000000_database_migration_3_4_manual_loyalty_point_adjustment.sql
-- ODFE · Migration 3.4 · Manual loyalty point adjustment (admin only)
--
-- Canonical chain: sort AFTER 20260907000000_phase4_module3_atomic_payment.sql.
-- Fixes the missing RPC that addLoyaltyPoints() in
-- lib/services/customer.service.ts:210 has always called via the typed shim:
--
--   function add_loyalty_points(uuid, uuid, integer, uuid, text, text)
--
-- Requires (all already in the canonical 3_3 chain, verified present):
--   public.app_current_cafe_id()   → 20260801100000 migration L43
--   public.app_is_admin()          → 20260801100000 migration L101
--   public.customers               → 20260801000000 migration (loyalty_points,
--                                    total_points_earned, tier_id, cafe_id)
--   public.loyalty_tiers           → 20260801000000 migration (min_points,
--                                    is_active, cafe_id)
--   public.wallet_transactions     → 20260802000000 migration (type CHECK
--                                    credit|debit, reference, description,
--                                    created_by)
--
-- ─────────────────────────────────────────────────────────────────────────────
-- LOCKED BUSINESS RULES (do not alter — owner-approved 2026-09-12):
--   1. Manual adjustment is ADMIN ONLY (public.app_is_admin()).
--   2. Cafe scoping: public.app_current_cafe_id() must equal p_cafe_id.
--   3. Positive adjustment (+p_points):
--        - loyalty_points        += p_points
--        - total_points_earned   += p_points      (monotonic, matches earn)
--        - tier recalculated     SAME algorithm as earn_loyalty_points
--          (loyalty_tiers.min_points <= total_points_earned ORDER BY
--           min_points DESC LIMIT 1, is_active = true)
--   4. Negative adjustment (-p_points):
--        - loyalty_points        -= |p_points|
--        - total_points_earned   NOT changed
--        - tier NOT downgraded
--        - if loyalty_points + p_points < 0 → RAISE EXCEPTION, NO changes:
--          NO loyalty_points change, NO total_points_earned change, NO ledger
--          row, full transaction rollback. NEVER clamp to zero. NEVER partially
--          apply. NEVER set balance to zero. ← LOCKED, non-negotiable.
--   5. p_points = 0 is rejected (nothing to do / cannot audit a zero change).
--   6. Audit: exactly ONE public.wallet_transactions row on success:
--        - amount      = ABS(p_points)
--        - type        = 'credit' (positive) | 'debit' (negative)
--        - reference   = p_idempotency_key (idempotency)
--        - description = COALESCE(NULLIF(p_reason,''), 'Manual points adjustment')
--        - created_by  = p_profile_id (actor)
--      NO reward_redemptions row, NO wallet_balance change.
--   7. Idempotency: key is scoped (cafe_id, customer_id, reference). Customer
--      row is locked FOR UPDATE BEFORE the idempotency check so concurrent
--      identical requests serialize: the second sees the first's ledger row
--      and returns the current balance WITHOUT re-applying. RETURN value is a
--      no-op that still returns the pre-existing balance (race-safe).
--   8. Returns the NEW loyalty_points balance (INTEGER) after a real change,
--      or the CURRENT balance on an idempotent no-op.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.add_loyalty_points(
  p_customer_id UUID,
  p_cafe_id UUID,
  p_points INTEGER,
  p_profile_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked        BOOLEAN;
  v_current       INTEGER;
  v_new_balance   INTEGER;
  v_tier_id       UUID;
  v_credit        BOOLEAN;
  v_description   TEXT;
BEGIN
  -- ─── 1. Cafe scoping guard (canonical earn/redeem convention) ────────────────
  IF public.app_current_cafe_id() IS DISTINCT FROM p_cafe_id THEN
    RAISE EXCEPTION 'Cafe access denied';
  END IF;

  -- ─── 2. Admin-only guard ──────────────────────────────────────────────────────
  IF NOT public.app_is_admin() THEN
    RAISE EXCEPTION 'Admin access denied';
  END IF;

  -- ─── 3. Zero adjustment is rejected (cannot audit a no-op) ───────────────────
  IF p_points = 0 THEN
    RAISE EXCEPTION 'Points adjustment must not be zero';
  END IF;

  -- ─── 4. Lock the customer row (serialises idempotency + balance math) ────────
  SELECT loyalty_points INTO v_current
  FROM public.customers
  WHERE id = p_customer_id AND cafe_id = p_cafe_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found for cafe %', p_cafe_id;
  END IF;

  -- ─── 5. Idempotency (after the lock): same (cafe, customer, reference) ───────
  --        applies at most once. A duplicate key returns the CURRENT balance
  --        with no further writes.
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE cafe_id = p_cafe_id
      AND customer_id = p_customer_id
      AND reference = p_idempotency_key
  ) THEN
    RETURN v_current;
  END IF;

  -- ─── 6. LOCKED negative rule: NEVER clamp, NEVER zero, NEVER partially ───────
  --        apply. If the resulting balance would be negative the whole
  --        transaction raises and rolls back (no ledger row, no balance
  --        change, no total_points_earned change).
  v_new_balance := v_current + p_points;    -- signed, full precision
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION
      'Insufficient points: requested % (would make balance % for customer %); adjustment rejected and rolled back',
      p_points, v_new_balance, p_customer_id;
  END IF;

  -- ─── 7. Apply ────────────────────────────────────────────────────────────────
  v_credit := p_points > 0;

  IF v_credit THEN
    -- Positive: bump both counters (monotonic lifetime earnings), re-tier with
    -- the SAME algorithm the canonical earn_loyalty_points uses.
    UPDATE public.customers
    SET loyalty_points       = loyalty_points + p_points,
        total_points_earned = total_points_earned + p_points
    WHERE id = p_customer_id AND cafe_id = p_cafe_id;

    SELECT id INTO v_tier_id
    FROM public.loyalty_tiers
    WHERE cafe_id = p_cafe_id
      AND min_points <= (
        SELECT total_points_earned
        FROM public.customers
        WHERE id = p_customer_id AND cafe_id = p_cafe_id
      )
      AND is_active = true
    ORDER BY min_points DESC
    LIMIT 1;

    IF v_tier_id IS NOT NULL THEN
      UPDATE public.customers
      SET tier_id = v_tier_id
      WHERE id = p_customer_id AND cafe_id = p_cafe_id;
    END IF;
  ELSE
    -- Negative: debit only. total_points_earned and tier stay untouched.
    UPDATE public.customers
    SET loyalty_points = loyalty_points + p_points      -- p_points < 0
    WHERE id = p_customer_id AND cafe_id = p_cafe_id;
  END IF;

  -- ─── 8. Audit — exactly one wallet_transactions row ───────────────────────────
  v_description := COALESCE(NULLIF(p_reason, ''), 'Manual points adjustment');

  INSERT INTO public.wallet_transactions (
    cafe_id, customer_id, amount, type, reference, description, created_by
  )
  VALUES (
    p_cafe_id, p_customer_id, ABS(p_points),
    CASE WHEN v_credit THEN 'credit' ELSE 'debit' END,
    p_idempotency_key, v_description, p_profile_id
  );

  -- ─── 9. Return the NEW balance ────────────────────────────────────────────────
  RETURN v_new_balance;
END;
$$;

-- ─── Security posture (canonical chain convention) ───────────────────────────
REVOKE ALL ON FUNCTION public.add_loyalty_points(UUID, UUID, INTEGER, UUID, TEXT, TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_loyalty_points(UUID, UUID, INTEGER, UUID, TEXT, TEXT)
  FROM anon;
GRANT EXECUTE ON FUNCTION public.add_loyalty_points(UUID, UUID, INTEGER, UUID, TEXT, TEXT)
  TO authenticated;

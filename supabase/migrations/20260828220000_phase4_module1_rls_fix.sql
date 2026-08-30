-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4 — MODULE 1: RLS FINAL AUDIT FIX
-- Date: 2026-08-28
-- Project: ODFE multi-tenant cafe POS (live project: bosgplvkuxtykfsnadcv)
--
-- CONFIRMED ISSUE (live-verified on 2026-08-28):
--   The 12 business-operations tables and the `employees` table grant access
--   through policies built on `public.auth_cafe_id()`, which resolves the
--   caller's cafe as
--       SELECT cafe_id FROM public.profiles WHERE id = auth.uid()
--   WITHOUT checking profiles.is_active.
--
--   Live probe: a user whose profile was toggled to is_active = false could
--   still SELECT inventory_items / suppliers / purchase_orders /
--   purchase_order_items and INSERT inventory_items. Disabled staff therefore
--   keep full CRUD access to cafe business data.
--
-- FIX:
--   * Rebuild the single canonical business policy `cafe_scoped_all` (FOR ALL,
--     TO authenticated) using `public.app_current_cafe_id()`, which additionally
--     requires profiles.is_active = true.
--   * Drop the redundant `business_ops_cafe_scoped_all` duplicate on the same
--     tables.
--   * Rebuild the `employees` SELECT policy with the active-profile check.
--
-- SAFETY:
--   * DROP POLICY IF EXISTS is used ONLY for the policies being replaced.
--   * No tables, columns, constraints, functions, RPCs, or data are touched.
--   * Idempotent: policy names are fixed, so re-running drops and re-creates.
--   * RLS is (re)enabled defensively; ENABLE ROW LEVEL SECURITY is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Rebuild business-operations tables' policies (active-profile aware)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_items', 'stock_movements', 'product_ingredients',
    'suppliers', 'purchase_orders', 'purchase_order_items',
    'loyalty_tiers', 'wallet_transactions', 'referral_codes',
    'reward_redemptions', 'expense_categories', 'expenses'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS business_ops_cafe_scoped_all ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS cafe_scoped_all ON public.%I', t);
    EXECUTE format($policy$
      CREATE POLICY cafe_scoped_all ON public.%I
        FOR ALL TO authenticated
        USING (cafe_id = public.app_current_cafe_id())
        WITH CHECK (cafe_id = public.app_current_cafe_id())
    $policy$, t);
  END LOOP;
END $$;

-- 2) Rebuild employees SELECT policy (active-profile aware)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees
  FOR SELECT TO authenticated
  USING ((profile_id = auth.uid() AND cafe_id = public.app_current_cafe_id())
         OR cafe_id = public.app_current_cafe_id());

-- ── Post-apply verification (run in SQL Editor) ──────────────────────────────
-- SELECT tablename, policyname, cmd, roles
-- FROM   pg_policies
-- WHERE  schemaname = 'public'
--   AND  tablename = ANY (ARRAY[
--          'inventory_items','stock_movements','product_ingredients',
--          'suppliers','purchase_orders','purchase_order_items',
--          'loyalty_tiers','wallet_transactions','referral_codes',
--          'reward_redemptions','expense_categories','expenses','employees'
--        ])
-- ORDER  BY tablename, policyname;
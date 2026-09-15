-- ════════════════════════════════════════════════════════════════════════════
-- 20260913000000_self_order_tokens_admin_write_policy.sql
-- ODFE · Self-order token RLS write policy (staff QR-token management)
--
-- Canonical chain: sort AFTER 20260908000000_database_migration_3_4_manual_loyalty_point_adjustment.sql.
--
-- LIVE ISSUE (verified 2026-09-13):
--   ensureSelfOrderToken() (lib/services/table.service.ts:143) writes via
--   .upsert(..., { onConflict: "token" }) → INSERT ... ON CONFLICT DO UPDATE.
--   The 3_3 chain gave public.self_order_tokens ONLY a SELECT policy
--   (cafe_scoped_select, 20260801100000 migration L283). There is NO INSERT or
--   UPDATE policy, so every token write fails with:
--     new row violates row-level security policy for table 'self_order_tokens'
--   PostgreSQL checks the INSERT RLS WITH CHECK before conflict detection, so
--   an existing token row does NOT save the upsert, and the ON CONFLICT branch
--   would additionally need an UPDATE policy anyway. Both commands are required.
--
-- FIX (admin only, the intended policy):
--   * INSERT  — same cafe (public.app_current_cafe_id()) AND admin role
--               (public.app_current_role() = 'admin')
--   * UPDATE  — same cafe AND admin role
--   Cashiers are EXCLUDED: Tables/QR-token management is surfaced only in the
--   admin Tables UI; no repository or owner business requirement grants
--   cashiers table-QR token management.
--
-- SAFETY:
--   * The existing SELECT policy (cafe_scoped_select) is NOT touched.
--   * DROP POLICY IF EXISTS + CREATE POLICY: idempotent, fixed policy names.
--   * ALTER TABLE ... ENABLE ROW LEVEL SECURITY is defensive; already enabled.
--   * No tables, columns, constraints, functions, RPCs, seed rows, or
--     self-order token generation logic are modified. No app code changes.
--   * Customers cannot write: the new policies are FOR authenticated but gate
--     on app_current_role() = 'admin', so customer-role profiles still have no
--     INSERT/UPDATE policy and RLS continues to deny them.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.self_order_tokens ENABLE ROW LEVEL SECURITY;

-- INSERT side of the UPSERT (covers new tokens; also evaluated before conflict
-- detection for tokens that already exist).
DROP POLICY IF EXISTS cafe_scoped_insert ON public.self_order_tokens;
CREATE POLICY cafe_scoped_insert ON public.self_order_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    cafe_id = public.app_current_cafe_id()
    AND public.app_current_role() = 'admin'
  );

-- UPDATE side of the UPSERT (covers the ON CONFLICT DO UPDATE branch that fires
-- when the token already exists, e.g. re-showing the QR for an existing table).
DROP POLICY IF EXISTS cafe_scoped_update ON public.self_order_tokens;
CREATE POLICY cafe_scoped_update ON public.self_order_tokens
  FOR UPDATE TO authenticated
  USING (
    cafe_id = public.app_current_cafe_id()
    AND public.app_current_role() = 'admin'
  )
  WITH CHECK (
    cafe_id = public.app_current_cafe_id()
    AND public.app_current_role() = 'admin'
  );

-- ── Post-apply verification (run in SQL Editor) ──────────────────────────────
-- SELECT tablename, policyname, cmd, roles
-- FROM   pg_policies
-- WHERE  schemaname = 'public'
--   AND  tablename  = 'self_order_tokens'
-- ORDER  BY cmd, policyname;
-- Expected: SELECT cafe_scoped_select (authenticated),
--           INSERT cafe_scoped_insert (authenticated),
--           UPDATE cafe_scoped_update (authenticated).
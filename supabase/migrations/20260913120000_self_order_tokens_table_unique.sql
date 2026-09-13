-- ════════════════════════════════════════════════════════════════════════════
-- 20260913120000_self_order_tokens_table_unique.sql
-- ODFE · Self-order token table-ID uniqueness (correct conflict target)
--
-- Canonical chain: sort AFTER
-- 20260913000000_self_order_tokens_admin_write_policy.sql.
--
-- LIVE RULE (verified 2026-09-13):
--   public.self_order_tokens has:
--     * self_order_tokens_pkey            PRIMARY KEY (id)
--     * self_order_tokens_table_unique    UNIQUE (table_id)   ← live identity
--     * self_order_tokens_token_key       UNIQUE (token)
--     * self_order_tokens_cafe_active_idx NON-UNIQUE (cafe_id, is_active)
--   → ONE self_order_tokens row per table_id.
--
-- APP FIX (lib/services/table.service.ts:154):
--   ensureSelfOrderToken() upserts with { onConflict: "table_id" } so the
--   atomic INSERT ... ON CONFLICT (table_id) DO UPDATE reconciles the row by
--   table identity and refreshes token to the current cafe_tables.qr_token.
--   Previously { onConflict: "token" } selected the wrong arbiter, so a NEW
--   cafe_tables.qr_token (T-01) missed the token conflict and the INSERT fired
--   self_order_tokens_table_unique → duplicate key violation.
--
-- WHAT THIS MIGRATION DOES
--   Fresh databases built from the canonical 3_3 chain create
--   self_order_tokens with ONLY UNIQUE(token) (20260801000000, L297), so the
--   production one-row-per-table rule is missing there. This migration adds it
--   with the explicit production constraint name.
--
--   * ADD CONSTRAINT self_order_tokens_table_unique UNIQUE (table_id)
--   * Idempotent: guarded by a pg_constraint existence check (a DO block).
--     PostgreSQL does NOT support ADD CONSTRAINT IF NOT EXISTS, so the check
--     is performed in PL/pgSQL against pg_catalog.pg_constraint.
--   * Live already has this constraint → no-op on live (verified read-only).
--   * Nothing is dropped or modified:
--       - self_order_tokens_pkey            kept
--       - self_order_tokens_token_key       kept (UNIQUE(token))
--       - self_order_tokens_cafe_active_idx kept (non-unique index)
--       - no RLS policies, triggers, functions, columns, or rows touched
--   * The applied RLS migration (20260913000000) is NOT modified.
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname   = 'self_order_tokens_table_unique'
      AND conrelid  = 'public.self_order_tokens'::regclass
      AND contype   = 'u'
  ) THEN
    ALTER TABLE public.self_order_tokens
      ADD CONSTRAINT self_order_tokens_table_unique UNIQUE (table_id);
  END IF;
END;
$$;

-- ── Post-apply verification (run in SQL Editor) ──────────────────────────────
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM   pg_catalog.pg_constraint
-- WHERE  conrelid = 'public.self_order_tokens'::regclass
-- ORDER  BY conname;
-- Expected (in addition to any NOT NULL attrs):
--   self_order_tokens_cafe_active_idx (index, non-unique)  [see pg_indexes]
--   self_order_tokens_pkey            p  UNIQUE (id)
--   self_order_tokens_table_unique    u  UNIQUE (table_id)
--   self_order_tokens_token_key       u  UNIQUE (token)
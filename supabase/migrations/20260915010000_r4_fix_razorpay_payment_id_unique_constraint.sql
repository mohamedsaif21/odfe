-- ─────────────────────────────────────────────────────────────────────────────
-- R4 CORRECTIVE: Add UNIQUE constraint on razorpay_payment_verifications
-- Date: 2026-09-15
--
-- ROOT CAUSE
--   The original R4 migration (20260915000000) declares
--   CREATE UNIQUE INDEX IF NOT EXISTS razorpay_payment_id_unique …
--   but the live table was created without this index (partial application).
--   The route handler's upsert uses:
--     onConflict: "razorpay_payment_id"
--   which requires a UNIQUE constraint on that column. Without it, PostgREST
--   returns an error and the verification ticket INSERT fails.
--
-- FIX
--   Re-create the UNIQUE index with IF NOT EXISTS (idempotent / safe).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS razorpay_payment_id_unique
  ON public.razorpay_payment_verifications (razorpay_payment_id);

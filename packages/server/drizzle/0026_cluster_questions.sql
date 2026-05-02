-- Add ThoughtCluster.questions column for AI-generated grow-this-cluster questions.
-- Hand-rolled SQL (matches 0024/0025 precedent — drizzle-kit's auto-generation has
-- known journal-sync issues here).
--
-- Effects:
--   1. Add ThoughtCluster.questions jsonb column with empty-array default.
--
-- Wrapped in a single transaction.

BEGIN;

ALTER TABLE "ThoughtCluster"
  ADD COLUMN IF NOT EXISTS "questions" jsonb DEFAULT '[]'::jsonb;

COMMIT;

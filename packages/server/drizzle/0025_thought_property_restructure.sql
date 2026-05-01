-- Thought Property Restructure
-- Per spec: docs/superpowers/specs/2026-05-01-thought-property-restructure-design.md
--
-- Hand-rolled SQL (matches 0024 precedent). Drizzle-kit's auto-generation
-- can't infer the projects→ideas rename or crystallizedIdeas→ideas merge
-- without interactive prompts.
--
-- Effects:
--   1. Replace Thought.purpose with Thought.kind (default 'thought')
--   2. Drop Thought maturity columns + promoted_project_id
--   3. Add ThoughtCluster.brief column
--   4. Add 11 crystallized columns + validation_status to Project
--   5. Backfill from CrystallizedIdea (defensive — production table is empty)
--   6. Drop CrystallizedIdea table
--   7. Drop Project.promoted / promoted_at (vestigial)
--   8. Rename Project → Idea (FKs on child tables update automatically;
--      constraint names on those children remain ProjectXxx_yyy_fkey for now)
--   9. Add Idea.source_cluster_id FK + index
--
-- Wrapped in a single transaction.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Thought.kind backfill from purpose, then drop purpose
-- ----------------------------------------------------------------------------
ALTER TABLE "Thought"
  ADD COLUMN "kind" text DEFAULT 'thought' NOT NULL;

UPDATE "Thought" SET "kind" = 'note' WHERE "purpose" = 'note';

-- ----------------------------------------------------------------------------
-- 2. Drop maturity columns + promoted_project_id from Thought
-- ----------------------------------------------------------------------------
ALTER TABLE "Thought" DROP CONSTRAINT IF EXISTS "Thought_promotedProjectId_fkey";

ALTER TABLE "Thought" DROP COLUMN IF EXISTS "maturity_level";
ALTER TABLE "Thought" DROP COLUMN IF EXISTS "maturity_notes";
ALTER TABLE "Thought" DROP COLUMN IF EXISTS "maturity_history";
ALTER TABLE "Thought" DROP COLUMN IF EXISTS "promoted_project_id";

-- ----------------------------------------------------------------------------
-- 3. Add ThoughtCluster.brief column for generateBrief persistence
-- ----------------------------------------------------------------------------
ALTER TABLE "ThoughtCluster"
  ADD COLUMN IF NOT EXISTS "brief" text;

-- ----------------------------------------------------------------------------
-- 4. Add crystallized columns + validation_status to Project (pre-rename)
-- ----------------------------------------------------------------------------
ALTER TABLE "Project" ADD COLUMN "problem_statement" text;
ALTER TABLE "Project" ADD COLUMN "target_audience" text;
ALTER TABLE "Project" ADD COLUMN "proposed_solution" text;
ALTER TABLE "Project" ADD COLUMN "unique_angle" text;
ALTER TABLE "Project" ADD COLUMN "pricing_hypothesis" text;
ALTER TABLE "Project" ADD COLUMN "spark_answers" jsonb;
ALTER TABLE "Project" ADD COLUMN "spark_session_id" text;
ALTER TABLE "Project" ADD COLUMN "source_cluster_id" text;
ALTER TABLE "Project" ADD COLUMN "source_thought_ids" text[] DEFAULT '{}';
ALTER TABLE "Project" ADD COLUMN "crystallized_at" timestamp(3);
ALTER TABLE "Project" ADD COLUMN "crystallized_by" text;
ALTER TABLE "Project" ADD COLUMN "validation_status" text DEFAULT 'draft' NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. Backfill from CrystallizedIdea (defensive — table is empty in prod today)
-- ----------------------------------------------------------------------------
UPDATE "Project" p
SET
  problem_statement   = ci.problem_statement,
  target_audience     = ci.target_audience,
  proposed_solution   = ci.proposed_solution,
  unique_angle        = ci.unique_angle,
  pricing_hypothesis  = ci.pricing_hypothesis,
  spark_answers       = ci.spark_answers,
  spark_session_id    = ci.spark_session_id,
  source_cluster_id   = ci.cluster_id,
  source_thought_ids  = ci.source_thought_ids,
  crystallized_at     = ci.crystallized_at,
  crystallized_by     = ci.crystallized_by
FROM "CrystallizedIdea" ci
WHERE ci.project_id = p.id;

-- ----------------------------------------------------------------------------
-- 6. Drop CrystallizedIdea table (data is now in Project, soon to be Idea)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS "CrystallizedIdea";

-- ----------------------------------------------------------------------------
-- 7. Drop legacy promoted columns
-- ----------------------------------------------------------------------------
ALTER TABLE "Project" DROP COLUMN IF EXISTS "promoted";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "promoted_at";

-- ----------------------------------------------------------------------------
-- 8. Drop Thought.purpose (data already migrated to kind)
-- ----------------------------------------------------------------------------
ALTER TABLE "Thought" DROP COLUMN "purpose";

-- ----------------------------------------------------------------------------
-- 9. Rename Project → Idea
--    PostgreSQL auto-updates FK references on child tables; constraint NAMES
--    on those children (e.g. ProjectAttachment_projectId_fkey) are preserved.
--    They still reference the renamed parent correctly.
-- ----------------------------------------------------------------------------
ALTER TABLE "Project" RENAME TO "Idea";

-- Rename Project's own indexes to match new table name
ALTER INDEX "Project_status_idx" RENAME TO "Idea_status_idx";
ALTER INDEX "Project_userId_idx" RENAME TO "Idea_userId_idx";
ALTER INDEX "Project_userId_status_idx" RENAME TO "Idea_userId_status_idx";

-- Rename Project's own FK constraint
ALTER TABLE "Idea" RENAME CONSTRAINT "Project_userId_fkey" TO "Idea_userId_fkey";

-- ----------------------------------------------------------------------------
-- 10. Add Idea.source_cluster_id FK + index
-- ----------------------------------------------------------------------------
CREATE INDEX "Idea_sourceClusterId_idx" ON "Idea" USING btree ("source_cluster_id");

ALTER TABLE "Idea"
  ADD CONSTRAINT "Idea_sourceClusterId_fkey"
  FOREIGN KEY ("source_cluster_id") REFERENCES "ThoughtCluster"("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

COMMIT;

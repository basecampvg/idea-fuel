-- Create ProjectAttachment table (the one real schema gap per RECONCILIATION.md).
-- Derived directly from packages/server/src/db/schema.ts:233-257.
--
-- Written as hand-rolled SQL rather than via `drizzle-kit push` because push
-- over-reports drift (wants to recreate CreditTransaction, expand_* columns,
-- Assumption unique constraint, etc. — all of which already exist in live DB).
-- See PRE_LAUNCH_FIXES_SUMMARY.md for the full note.
--
-- Wrapped in a transaction so any failure leaves the DB untouched.

BEGIN;

CREATE TABLE "ProjectAttachment" (
  "id" text PRIMARY KEY NOT NULL,
  "storage_path" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "ai_consent" boolean DEFAULT false NOT NULL,
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "ProjectAttachment_projectId_idx"
  ON "ProjectAttachment" USING btree ("project_id");

CREATE INDEX "ProjectAttachment_userId_idx"
  ON "ProjectAttachment" USING btree ("user_id");

ALTER TABLE "ProjectAttachment"
  ADD CONSTRAINT "ProjectAttachment_projectId_fkey"
  FOREIGN KEY ("project_id") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectAttachment"
  ADD CONSTRAINT "ProjectAttachment_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

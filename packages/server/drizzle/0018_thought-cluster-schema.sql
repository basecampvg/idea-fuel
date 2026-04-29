CREATE TYPE "public"."ThoughtType" AS ENUM('problem', 'solution', 'what_if', 'observation', 'question');--> statement-breakpoint
CREATE TABLE "ThoughtCluster" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"description" text,
	"themes" jsonb DEFAULT '[]'::jsonb,
	"tensions" jsonb DEFAULT '[]'::jsonb,
	"gaps" jsonb DEFAULT '[]'::jsonb,
	"synthesis" text,
	"cluster_maturity" text DEFAULT 'exploring' NOT NULL,
	"readiness_score" double precision,
	"dimension_coverage" jsonb,
	"project_id" text,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Thought" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"thought_type" "ThoughtType" DEFAULT 'observation' NOT NULL,
	"type_source" text DEFAULT 'ai_auto' NOT NULL,
	"tags" text[] DEFAULT '{}',
	"ai_tags" text[] DEFAULT '{}',
	"maturity_level" text DEFAULT 'spark' NOT NULL,
	"maturity_notes" text,
	"maturity_history" jsonb DEFAULT '[]'::jsonb,
	"confidence_level" text DEFAULT 'untested' NOT NULL,
	"thought_number" integer NOT NULL,
	"reactions" jsonb DEFAULT '[]'::jsonb,
	"capture_method" text DEFAULT 'quick_text' NOT NULL,
	"voice_memo_url" text,
	"transcription" text,
	"capture_source" text,
	"ai_refinement" text,
	"refined_title" text,
	"refined_description" text,
	"refined_tags" jsonb,
	"last_refined_at" timestamp (3),
	"last_surfaced_at" timestamp (3),
	"surface_count" integer DEFAULT 0 NOT NULL,
	"dismiss_count" integer DEFAULT 0 NOT NULL,
	"react_count" integer DEFAULT 0 NOT NULL,
	"collision_ids" text[] DEFAULT '{}',
	"incubation_score" double precision DEFAULT 0 NOT NULL,
	"cluster_id" text,
	"cluster_position" integer,
	"source_thought_id" text,
	"promoted_project_id" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ThoughtAttachment" (
	"id" text PRIMARY KEY NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"thought_id" text NOT NULL,
	"user_id" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ThoughtConnection" (
	"id" text PRIMARY KEY NOT NULL,
	"thought_a_id" text NOT NULL,
	"thought_b_id" text NOT NULL,
	"connection_type" text NOT NULL,
	"strength" double precision DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"surfaced_at" timestamp (3),
	"user_action" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ThoughtEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"thought_id" text NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ThoughtComment" (
	"id" text PRIMARY KEY NOT NULL,
	"thought_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CrystallizedIdea" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cluster_id" text,
	"project_id" text NOT NULL,
	"problem_statement" text,
	"target_audience" text,
	"proposed_solution" text,
	"unique_angle" text,
	"pricing_hypothesis" text,
	"spark_answers" jsonb,
	"spark_session_id" text,
	"source_thought_ids" text[] DEFAULT '{}',
	"crystallized_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"crystallized_by" text NOT NULL
);
--> statement-breakpoint
-- DATA BACKFILL: Migrate Sandbox → ThoughtCluster
INSERT INTO "ThoughtCluster" ("id", "name", "color", "userId", "createdAt", "updatedAt")
SELECT "id", "name", "color", "userId", "createdAt", "updatedAt"
FROM "Sandbox";
--> statement-breakpoint
-- DATA BACKFILL: Migrate Note → Thought (assign thought_number via row_number)
INSERT INTO "Thought" ("id", "content", "thought_type", "type_source", "refined_title", "refined_description", "refined_tags", "last_refined_at", "cluster_id", "source_thought_id", "promoted_project_id", "thought_number", "userId", "createdAt", "updatedAt")
SELECT
  "id",
  "content",
  'observation',
  CASE WHEN "type" = 'AI' THEN 'ai_auto' ELSE 'user' END,
  "refined_title",
  "refined_description",
  "refined_tags",
  "last_refined_at",
  "sandbox_id",
  "source_note_id",
  "promoted_project_id",
  ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC),
  "userId",
  "createdAt",
  "updatedAt"
FROM "Note";
--> statement-breakpoint
-- DATA BACKFILL: Migrate NoteAttachment → ThoughtAttachment
INSERT INTO "ThoughtAttachment" ("id", "storage_path", "file_name", "mime_type", "size_bytes", "order", "thought_id", "user_id", "createdAt")
SELECT "id", "storage_path", "file_name", "mime_type", "size_bytes", "order", "note_id", "user_id", "createdAt"
FROM "NoteAttachment";
--> statement-breakpoint
-- Drop old tables after backfill
DROP TABLE "NoteAttachment" CASCADE;--> statement-breakpoint
DROP TABLE "Note" CASCADE;--> statement-breakpoint
DROP TABLE "Sandbox" CASCADE;--> statement-breakpoint
ALTER TABLE "CrystallizedIdea" ADD CONSTRAINT "CrystallizedIdea_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CrystallizedIdea" ADD CONSTRAINT "CrystallizedIdea_clusterId_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."ThoughtCluster"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CrystallizedIdea" ADD CONSTRAINT "CrystallizedIdea_projectId_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ThoughtAttachment" ADD CONSTRAINT "ThoughtAttachment_thoughtId_fkey" FOREIGN KEY ("thought_id") REFERENCES "public"."Thought"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ThoughtAttachment" ADD CONSTRAINT "ThoughtAttachment_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Thought" ADD CONSTRAINT "Thought_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Thought" ADD CONSTRAINT "Thought_promotedProjectId_fkey" FOREIGN KEY ("promoted_project_id") REFERENCES "public"."Project"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Thought" ADD CONSTRAINT "Thought_sourceThoughtId_fkey" FOREIGN KEY ("source_thought_id") REFERENCES "public"."Thought"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Thought" ADD CONSTRAINT "Thought_clusterId_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."ThoughtCluster"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ThoughtCluster" ADD CONSTRAINT "ThoughtCluster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ThoughtComment" ADD CONSTRAINT "ThoughtComment_thoughtId_fkey" FOREIGN KEY ("thought_id") REFERENCES "public"."Thought"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ThoughtComment" ADD CONSTRAINT "ThoughtComment_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ThoughtConnection" ADD CONSTRAINT "ThoughtConnection_thoughtAId_fkey" FOREIGN KEY ("thought_a_id") REFERENCES "public"."Thought"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ThoughtConnection" ADD CONSTRAINT "ThoughtConnection_thoughtBId_fkey" FOREIGN KEY ("thought_b_id") REFERENCES "public"."Thought"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ThoughtEvent" ADD CONSTRAINT "ThoughtEvent_thoughtId_fkey" FOREIGN KEY ("thought_id") REFERENCES "public"."Thought"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "CrystallizedIdea_userId_idx" ON "CrystallizedIdea" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ThoughtAttachment_thoughtId_idx" ON "ThoughtAttachment" USING btree ("thought_id");--> statement-breakpoint
CREATE INDEX "ThoughtAttachment_userId_idx" ON "ThoughtAttachment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "Thought_userId_idx" ON "Thought" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Thought_userId_updatedAt_idx" ON "Thought" USING btree ("userId","updatedAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "Thought_clusterId_idx" ON "Thought" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "ThoughtCluster_userId_updatedAt_idx" ON "ThoughtCluster" USING btree ("userId","updatedAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ThoughtComment_thoughtId_idx" ON "ThoughtComment" USING btree ("thought_id","createdAt");--> statement-breakpoint
CREATE INDEX "ThoughtConnection_thoughtAId_idx" ON "ThoughtConnection" USING btree ("thought_a_id");--> statement-breakpoint
CREATE INDEX "ThoughtConnection_thoughtBId_idx" ON "ThoughtConnection" USING btree ("thought_b_id");--> statement-breakpoint
CREATE INDEX "ThoughtEvent_thoughtId_idx" ON "ThoughtEvent" USING btree ("thought_id","createdAt" DESC NULLS LAST);

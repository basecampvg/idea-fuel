CREATE TYPE "public"."ProjectMode" AS ENUM('LAUNCH', 'EXPAND');--> statement-breakpoint
ALTER TYPE "public"."ReportType" ADD VALUE 'OPPORTUNITY_SCORECARD';--> statement-breakpoint
ALTER TYPE "public"."ReportType" ADD VALUE 'EXPANSION_BUSINESS_CASE';--> statement-breakpoint
ALTER TYPE "public"."ReportType" ADD VALUE 'RISK_CANNIBALIZATION';--> statement-breakpoint
ALTER TABLE "Interview" ADD COLUMN "expand_track_progress" jsonb;--> statement-breakpoint
ALTER TABLE "Project" ADD COLUMN "mode" "ProjectMode" DEFAULT 'LAUNCH' NOT NULL;--> statement-breakpoint
ALTER TABLE "Project" ADD COLUMN "business_context" jsonb;--> statement-breakpoint
ALTER TABLE "Research" ADD COLUMN "expand_research_data" jsonb;--> statement-breakpoint
ALTER TABLE "Research" ADD COLUMN "expand_opportunity_engine" jsonb;--> statement-breakpoint
ALTER TABLE "Research" ADD COLUMN "expand_moat_audit" jsonb;
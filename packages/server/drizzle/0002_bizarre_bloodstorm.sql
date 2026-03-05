ALTER TYPE "public"."SubscriptionTier" ADD VALUE 'TESTER';--> statement-breakpoint
ALTER TABLE "Assumption" DROP CONSTRAINT "Assumption_projectId_key_key";--> statement-breakpoint
ALTER TABLE "Assumption" ALTER COLUMN "projectId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Interview" ADD COLUMN "research_engine" text DEFAULT 'OPENAI' NOT NULL;--> statement-breakpoint
ALTER TABLE "Research" ADD COLUMN "research_engine" text DEFAULT 'OPENAI' NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "founder_profile" jsonb;--> statement-breakpoint
CREATE INDEX "BudgetLineItem_modelId_category_idx" ON "BudgetLineItem" USING btree ("modelId","category");--> statement-breakpoint
CREATE INDEX "ERPConnection_userId_provider_idx" ON "ERPConnection" USING btree ("userId","provider");--> statement-breakpoint
CREATE INDEX "FinancialModel_userId_status_idx" ON "FinancialModel" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "ModelSnapshot_modelId_createdAt_idx" ON "ModelSnapshot" USING btree ("modelId","createdAt");--> statement-breakpoint
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_scenarioId_key_key" UNIQUE("scenarioId","key");
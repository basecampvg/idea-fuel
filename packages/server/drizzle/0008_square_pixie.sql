CREATE TYPE "public"."AssumptionAggregation" AS ENUM('SUM', 'AVERAGE', 'CUSTOM');--> statement-breakpoint
CREATE TABLE "ModelModule" (
	"id" text PRIMARY KEY NOT NULL,
	"modelId" text NOT NULL,
	"moduleKey" text NOT NULL,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"settings" jsonb,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ModelModule_modelId_moduleKey_key" UNIQUE("modelId","moduleKey")
);
--> statement-breakpoint
ALTER TABLE "Assumption" ADD COLUMN "aggregationMode" "AssumptionAggregation" DEFAULT 'SUM';--> statement-breakpoint
ALTER TABLE "Research" ADD COLUMN "business_plan_cover_style" text DEFAULT '1';--> statement-breakpoint
ALTER TABLE "Research" ADD COLUMN "positioning_cover_style" text DEFAULT '1';--> statement-breakpoint
ALTER TABLE "ModelModule" ADD CONSTRAINT "ModelModule_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "public"."FinancialModel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ModelModule_modelId_idx" ON "ModelModule" USING btree ("modelId");
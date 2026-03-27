ALTER TYPE "public"."SubscriptionTier" ADD VALUE 'MOBILE';--> statement-breakpoint
ALTER TABLE "Project" ADD COLUMN "promoted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Project" ADD COLUMN "promoted_at" timestamp (3);--> statement-breakpoint
ALTER TABLE "Project" ADD COLUMN "card_result" jsonb;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "free_card_used" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "mobile_card_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "mobile_card_reset_at" timestamp (3);
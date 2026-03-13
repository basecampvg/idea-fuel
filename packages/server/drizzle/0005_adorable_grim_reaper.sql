ALTER TABLE "User" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "stripe_current_period_end" timestamp (3);
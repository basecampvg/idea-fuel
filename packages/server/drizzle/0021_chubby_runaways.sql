CREATE TABLE "UserLabel" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Thought" ALTER COLUMN "thought_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Thought" ALTER COLUMN "thought_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Thought" ALTER COLUMN "maturity_level" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Thought" ALTER COLUMN "maturity_level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Thought" ALTER COLUMN "confidence_level" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Thought" ALTER COLUMN "confidence_level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Thought" ADD COLUMN "purpose" text DEFAULT 'idea' NOT NULL;--> statement-breakpoint
ALTER TABLE "UserLabel" ADD CONSTRAINT "UserLabel_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "UserLabel_userId_idx" ON "UserLabel" USING btree ("user_id");
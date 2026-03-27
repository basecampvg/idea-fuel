CREATE TABLE "Note" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"refined_title" text,
	"refined_description" text,
	"refined_tags" jsonb,
	"last_refined_at" timestamp (3),
	"promoted_project_id" text,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Note" ADD CONSTRAINT "Note_promotedProjectId_fkey" FOREIGN KEY ("promoted_project_id") REFERENCES "public"."Project"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Note_userId_idx" ON "Note" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Note_userId_updatedAt_idx" ON "Note" USING btree ("userId","updatedAt" DESC NULLS LAST);
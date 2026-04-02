CREATE TABLE "Sandbox" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Note" ADD COLUMN "sandbox_id" text;--> statement-breakpoint
ALTER TABLE "Sandbox" ADD CONSTRAINT "Sandbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Sandbox_userId_updatedAt_idx" ON "Sandbox" USING btree ("userId","updatedAt" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "Note" ADD CONSTRAINT "Note_sandboxId_fkey" FOREIGN KEY ("sandbox_id") REFERENCES "public"."Sandbox"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Note_sandboxId_idx" ON "Note" USING btree ("sandbox_id");
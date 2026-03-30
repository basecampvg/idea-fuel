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
--> statement-breakpoint
ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_projectId_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ProjectAttachment_projectId_idx" ON "ProjectAttachment" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ProjectAttachment_userId_idx" ON "ProjectAttachment" USING btree ("user_id");
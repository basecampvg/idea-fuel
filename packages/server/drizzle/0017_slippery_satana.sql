CREATE TABLE "NoteAttachment" (
	"id" text PRIMARY KEY NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"note_id" text NOT NULL,
	"user_id" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Sandbox" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "NoteAttachment" ADD CONSTRAINT "NoteAttachment_noteId_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."Note"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "NoteAttachment" ADD CONSTRAINT "NoteAttachment_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "NoteAttachment_noteId_idx" ON "NoteAttachment" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "NoteAttachment_userId_idx" ON "NoteAttachment" USING btree ("user_id");
CREATE TYPE "public"."NoteType" AS ENUM('QUICK', 'AI');--> statement-breakpoint
ALTER TABLE "Note" ADD COLUMN "type" "NoteType" DEFAULT 'AI' NOT NULL;--> statement-breakpoint
ALTER TABLE "Note" ADD COLUMN "source_note_id" text;--> statement-breakpoint
ALTER TABLE "Note" ADD CONSTRAINT "Note_sourceNoteId_fkey" FOREIGN KEY ("source_note_id") REFERENCES "public"."Note"("id") ON DELETE set null ON UPDATE cascade;
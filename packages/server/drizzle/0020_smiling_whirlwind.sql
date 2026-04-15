ALTER TABLE "Thought" RENAME COLUMN "react_count" TO "engage_count";--> statement-breakpoint
ALTER TABLE "Thought" ADD COLUMN "dismiss_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Thought" ADD COLUMN "resurface_excluded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "Thought_resurface_idx" ON "Thought" USING btree ("userId","resurface_excluded","next_surface_at");
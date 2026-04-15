ALTER TYPE "public"."EmbeddingSourceType" ADD VALUE 'THOUGHT';--> statement-breakpoint
ALTER TABLE "Embedding" ALTER COLUMN "projectId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Embedding" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "Thought" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "Thought" ADD COLUMN "next_surface_at" timestamp (3);--> statement-breakpoint
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Embedding_userId_idx" ON "Embedding" USING btree ("user_id");
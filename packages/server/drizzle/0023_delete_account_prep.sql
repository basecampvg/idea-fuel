-- Prepare schema for self-serve delete-account flow.
--
-- The only FK from a user-owned table to User that uses ON DELETE RESTRICT
-- is BlogPost.authorId. Without this change, deleting a user who authored
-- any blog post fails with a constraint violation — leaving the user stuck
-- in a half-deleted state. Flipping to ON DELETE SET NULL preserves the
-- published content (readers still see the post, byline becomes generic)
-- while letting the user record go.
--
-- Change 1: BlogPost.authorId becomes nullable.
-- Change 2: Replace FK from ON DELETE RESTRICT to ON DELETE SET NULL.
--
-- No data loss. Any existing authored posts keep their authorId value
-- until their author actually deletes their account.

ALTER TABLE "BlogPost" ALTER COLUMN "authorId" DROP NOT NULL;--> statement-breakpoint

ALTER TABLE "BlogPost" DROP CONSTRAINT IF EXISTS "BlogPost_authorId_fkey";--> statement-breakpoint

ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

/**
 * Seed script: Insert 10 SEO-optimized blog posts into the BlogPost table.
 *
 * Usage:
 *   npx tsx packages/server/src/scripts/seed-blog-posts.ts
 */
import { db } from '../db/drizzle';
import { blogPosts, users } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

import { getPost01 } from './blog-content/post-01-business-plan-generator';
import { getPost02 } from './blog-content/post-02-best-ai-tools-business';
import { getPost03 } from './blog-content/post-03-ai-market-research';
import { getPost04 } from './blog-content/post-04-ai-tools-small-business';
import { getPost05 } from './blog-content/post-05-pitch-deck-generator';
import { getPost06 } from './blog-content/post-06-ai-side-hustle';
import { getPost07 } from './blog-content/post-07-ai-for-entrepreneurs';
import { getPost08 } from './blog-content/post-08-validate-business-idea';
import { getPost09 } from './blog-content/post-09-business-automation';
import { getPost10 } from './blog-content/post-10-ai-marketing-small-business';

/**
 * Extract text from TipTap JSON content to calculate reading time and word count.
 */
function calculateReadingTime(content: unknown): { readingTime: string; wordCount: number } {
  let text = '';

  function extractText(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (n.type === 'text' && typeof n.text === 'string') {
      text += n.text + ' ';
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        extractText(child);
      }
    }
  }

  extractText(content);

  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minutes = Math.ceil(wordCount / 200);

  return {
    readingTime: `${minutes} min read`,
    wordCount,
  };
}

async function main() {
  // Find an admin user to attribute the posts to
  const admin = await db.query.users.findFirst({
    where: eq(users.role, 'ADMIN'),
    columns: { id: true, name: true },
  });

  if (!admin) {
    // Fallback: use any SUPER_ADMIN
    const superAdmin = await db.query.users.findFirst({
      where: eq(users.role, 'SUPER_ADMIN'),
      columns: { id: true, name: true },
    });
    if (!superAdmin) {
      console.error('No admin or super_admin user found. Cannot assign authorId.');
      process.exit(1);
    }
    console.log(`Using SUPER_ADMIN: ${superAdmin.name} (${superAdmin.id})`);
    return seedPosts(superAdmin.id);
  }

  console.log(`Using ADMIN: ${admin.name} (${admin.id})`);
  return seedPosts(admin.id);
}

async function seedPosts(authorId: string) {
  const postGetters = [
    getPost01, getPost02, getPost03, getPost04, getPost05,
    getPost06, getPost07, getPost08, getPost09, getPost10,
  ];

  // Delete existing posts with these slugs so we can re-insert with new dates
  const allSlugs = postGetters.map((g) => g().slug);
  const deleted = await db.delete(blogPosts).where(inArray(blogPosts.slug, allSlugs)).returning({ id: blogPosts.id });
  if (deleted.length > 0) {
    console.log(`Deleted ${deleted.length} existing posts to re-insert with spread dates.\n`);
  }

  const now = new Date();
  let inserted = 0;
  let skipped = 0;

  // Spread posts evenly over the last 60 days (oldest first, most recent = today)
  const SPREAD_DAYS = 60;
  const dayGap = SPREAD_DAYS / (postGetters.length - 1); // ~6.7 days between posts

  for (let i = 0; i < postGetters.length; i++) {
    const postData = postGetters[i]();
    const { readingTime, wordCount } = calculateReadingTime(postData.content);

    // Post 0 = 60 days ago, Post 9 = today
    const daysAgo = Math.round((postGetters.length - 1 - i) * dayGap);
    const publishedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    await db.insert(blogPosts).values({
      slug: postData.slug,
      title: postData.title,
      description: postData.description,
      content: postData.content,
      coverImage: (postData as Record<string, unknown>).coverImage as string | undefined,
      status: 'PUBLISHED',
      publishedAt,
      readingTime,
      wordCount,
      tags: postData.tags,
      authorId,
    });

    console.log(`  [OK] "${postData.title}" (${wordCount} words, ${readingTime})`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

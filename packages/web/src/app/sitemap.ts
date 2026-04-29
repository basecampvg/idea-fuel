import type { MetadataRoute } from 'next';
import { db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';
import { getAllTerms } from '@/lib/glossary';
import { getAllDocSlugs } from '@/lib/docs';

// Generated at build time on Vercel (DB + filesystem both available),
// then revalidated every hour via ISR to pick up new blog posts.
export const revalidate = 3600;

const BASE_URL = 'https://ideafuel.ai';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/demo-report`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/docs`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/glossary`, changeFrequency: 'weekly', priority: 0.8 },
  ];

  try {
    const posts = await db.query.blogPosts.findMany({
      where: eq(schema.blogPosts.status, 'PUBLISHED'),
      columns: { slug: true, updatedAt: true },
    });
    for (const post of posts) {
      entries.push({
        url: `${BASE_URL}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  } catch (err) {
    console.error('[sitemap] failed to load blog posts from DB:', err);
  }

  try {
    const docSlugs = getAllDocSlugs();
    for (const slugParts of docSlugs) {
      entries.push({
        url: `${BASE_URL}/docs/${slugParts.join('/')}`,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
    console.log(`[sitemap] added ${docSlugs.length} docs`);
  } catch (err) {
    console.error('[sitemap] failed to load docs:', err);
  }

  try {
    const terms = getAllTerms();
    for (const term of terms) {
      entries.push({
        url: `${BASE_URL}/glossary/${term.slug}`,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
    console.log(`[sitemap] added ${terms.length} glossary terms`);
  } catch (err) {
    console.error('[sitemap] failed to load glossary terms:', err);
  }

  return entries;
}

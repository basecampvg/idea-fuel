import type { MetadataRoute } from 'next';
import { db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // revalidate every hour

const BASE_URL = 'https://ideafuel.ai';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const entries: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/demo-report`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/docs`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/glossary`, changeFrequency: 'weekly', priority: 0.8 },
  ];

  // Blog posts from DB
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
  } catch (e) {
    console.error('[sitemap] Failed to fetch blog posts:', e);
  }

  // Docs from filesystem (may not be available in serverless env)
  try {
    const { getAllDocSlugs } = await import('@/lib/docs');
    const docSlugs = getAllDocSlugs();
    for (const slugParts of docSlugs) {
      entries.push({
        url: `${BASE_URL}/docs/${slugParts.join('/')}`,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  } catch (e) {
    console.error('[sitemap] Failed to read docs:', e);
  }

  // Glossary terms from filesystem
  try {
    const { getAllTerms } = await import('@/lib/glossary');
    const terms = getAllTerms();
    for (const term of terms) {
      entries.push({
        url: `${BASE_URL}/glossary/${term.slug}`,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch (e) {
    console.error('[sitemap] Failed to read glossary:', e);
  }

  return entries;
}

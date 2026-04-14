import type { MetadataRoute } from 'next';
import { db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';
import { getAllTerms } from '@/lib/glossary';
import { getAllDocSlugs } from '@/lib/docs';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // revalidate every hour

const BASE_URL = 'https://ideafuel.ai';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/demo-report`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/docs`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/glossary`, changeFrequency: 'weekly', priority: 0.8 },
  ];

  // Blog posts from DB
  const posts = await db.query.blogPosts.findMany({
    where: eq(schema.blogPosts.status, 'PUBLISHED'),
    columns: { slug: true, updatedAt: true },
  });
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Docs from filesystem
  const docSlugs = getAllDocSlugs();
  const docPages: MetadataRoute.Sitemap = docSlugs.map((slugParts) => ({
    url: `${BASE_URL}/docs/${slugParts.join('/')}`,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Glossary terms from filesystem
  const terms = getAllTerms();
  const glossaryPages: MetadataRoute.Sitemap = terms.map((term) => ({
    url: `${BASE_URL}/glossary/${term.slug}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages, ...docPages, ...glossaryPages];
}

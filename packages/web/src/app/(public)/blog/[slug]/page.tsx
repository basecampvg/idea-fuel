import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, schema } from '@forge/server';
import { eq, and, lt, gt, desc, asc } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TipTapRenderer, BlogCover, BlogToc } from '@/components/blog';
import { extractHeadingsFromTipTap } from '@/lib/blog-utils';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

async function getPost(slug: string) {
  const post = await db.query.blogPosts.findFirst({
    where: and(
      eq(schema.blogPosts.slug, slug),
      eq(schema.blogPosts.status, 'PUBLISHED'),
    ),
    with: {
      author: {
        columns: {
          name: true,
          image: true,
        },
      },
    },
  });

  return post;
}

async function getAdjacentPosts(slug: string) {
  const current = await db.query.blogPosts.findFirst({
    where: and(
      eq(schema.blogPosts.slug, slug),
      eq(schema.blogPosts.status, 'PUBLISHED'),
    ),
    columns: { publishedAt: true },
  });

  if (!current?.publishedAt) {
    return { prev: null, next: null };
  }

  const [prev, next] = await Promise.all([
    db.query.blogPosts.findFirst({
      where: and(
        eq(schema.blogPosts.status, 'PUBLISHED'),
        lt(schema.blogPosts.publishedAt, current.publishedAt),
      ),
      orderBy: desc(schema.blogPosts.publishedAt),
      columns: { slug: true, title: true },
    }),
    db.query.blogPosts.findFirst({
      where: and(
        eq(schema.blogPosts.status, 'PUBLISHED'),
        gt(schema.blogPosts.publishedAt, current.publishedAt),
      ),
      orderBy: asc(schema.blogPosts.publishedAt),
      columns: { slug: true, title: true },
    }),
  ]);

  return { prev, next };
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3006';
  const ogParams = new URLSearchParams({
    title: post.title,
    ...(post.tags?.[0] && { tag: post.tags[0] }),
    ...(post.author?.name && { author: post.author.name }),
    ...(post.publishedAt && {
      date: post.publishedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }),
  });
  const ogImage = `${baseUrl}/api/og?${ogParams.toString()}`;

  return {
    title: `${post.title} | Idea Fuel Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description ?? undefined,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      tags: post.tags ?? undefined,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description ?? undefined,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const { prev, next } = await getAdjacentPosts(slug);
  const headings = extractHeadingsFromTipTap(post.content);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: `https://ideafuel.ai/blog/${slug}`,
    ...(post.publishedAt && { datePublished: post.publishedAt.toISOString() }),
    ...(post.author?.name && {
      author: {
        '@type': 'Person',
        name: post.author.name,
      },
    }),
    publisher: { '@id': 'https://ideafuel.ai/#organization' },
    isPartOf: { '@id': 'https://ideafuel.ai/#website' },
    ...(post.tags && post.tags.length > 0 && { keywords: post.tags }),
  };

  const truncatedTitle =
    post.title.length > 50 ? post.title.slice(0, 50) + '...' : post.title;

  const formattedDate = post.publishedAt?.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav className="max-w-6xl mx-auto px-6 pt-6 flex items-center gap-1.5 text-[11px] uppercase tracking-[1.5px]">
        <Link
          href="/"
          className="text-[#928e87] transition-colors hover:text-white"
        >
          Home
        </Link>
        <span className="text-[#555]">/</span>
        <Link
          href="/blog"
          className="text-[#928e87] transition-colors hover:text-white"
        >
          Blog
        </Link>
        <span className="text-[#555]">/</span>
        <span className="font-medium text-white">{truncatedTitle}</span>
      </nav>

      {/* Hero header */}
      <header className="max-w-6xl mx-auto px-6 pt-8 pb-6">
        <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
          {post.title}
        </h1>
        <div className="flex items-center gap-3">
          {post.author?.name && (
            <div className="flex items-center gap-3">
              {post.author.image ? (
                <img
                  src={post.author.image}
                  alt={post.author.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  {post.author.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white">
                  Written by <span className="font-semibold">{post.author.name}</span>
                </p>
                <Link
                  href="/blog"
                  className="text-xs text-[#928e87] transition-colors hover:text-white"
                >
                  Return to blog
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Cover image */}
      <div className="max-w-6xl mx-auto px-6 mb-10">
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-auto rounded-xl"
          />
        ) : (
          <BlogCover slug={slug} hideOverlay className="w-full" />
        )}
      </div>

      {/* Two-column content area */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex gap-10">
          {/* Article content */}
          <article className="min-w-0 flex-1 max-w-[720px]">
            {/* Published date + read time */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
              {formattedDate && <span>Published {formattedDate}</span>}
              {formattedDate && post.readingTime && (
                <span className="text-[#555]">&middot;</span>
              )}
              {post.readingTime && <span>{post.readingTime}</span>}
            </div>

            {/* Description as TL;DR blockquote */}
            {post.description && (
              <blockquote className="border-l-4 border-primary/50 pl-4 py-3 mb-8 text-muted-foreground bg-muted/30 rounded-r-lg">
                <span className="font-semibold text-foreground not-italic">TL;DR: </span>
                {post.description}
              </blockquote>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Content */}
            <TipTapRenderer content={post.content} />

            {/* Navigation */}
            {(prev || next) && (
              <nav className="mt-16 pt-8 border-t border-border">
                <div className="flex justify-between gap-4">
                  {prev ? (
                    <Link href={`/blog/${prev.slug}`} className="group flex-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {prev.title}
                      </p>
                    </Link>
                  ) : (
                    <div />
                  )}
                  {next && (
                    <Link href={`/blog/${next.slug}`} className="group flex-1 text-right">
                      <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground mb-1">
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {next.title}
                      </p>
                    </Link>
                  )}
                </div>
              </nav>
            )}
          </article>

          {/* Sticky TOC sidebar */}
          <BlogToc headings={headings} readingTime={post.readingTime} />
        </div>
      </div>
    </div>
  );
}

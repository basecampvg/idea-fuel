import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, schema } from '@forge/server';
import { eq, and, lt, gt, desc, asc } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { TipTapRenderer } from '@/components/blog';

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
    // Previous = older posts (publishedAt < current)
    db.query.blogPosts.findFirst({
      where: and(
        eq(schema.blogPosts.status, 'PUBLISHED'),
        lt(schema.blogPosts.publishedAt, current.publishedAt),
      ),
      orderBy: desc(schema.blogPosts.publishedAt),
      columns: { slug: true, title: true },
    }),
    // Next = newer posts (publishedAt > current)
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

  return {
    title: `${post.title} | Forge Blog`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const { prev, next } = await getAdjacentPosts(slug);

  return (
    <div className="min-h-screen bg-background">
      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Back link */}
        <Link href="/blog">
          <Button variant="ghost" size="sm" className="mb-8 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Button>
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">{post.title}</h1>
          {post.description && (
            <p className="text-xl text-muted-foreground mb-6">{post.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {post.author?.name && (
              <>
                <span className="font-medium text-foreground">{post.author.name}</span>
                <span>·</span>
              </>
            )}
            {post.publishedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <time dateTime={post.publishedAt.toISOString()}>
                  {post.publishedAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>
            )}
            {post.readingTime && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{post.readingTime}</span>
                </div>
              </>
            )}
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="default">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        {/* Cover image */}
        {post.coverImage && (
          <div className="mb-8">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-auto rounded-lg"
            />
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
    </div>
  );
}

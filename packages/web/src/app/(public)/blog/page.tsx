import Link from 'next/link';
import { db, schema } from '@forge/server';
import { eq, desc } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Blog | Forge',
  description: 'Insights, updates, and guides for entrepreneurs and business builders.',
};

export const dynamic = 'force-dynamic';

async function getPosts() {
  const posts = await db.query.blogPosts.findMany({
    where: eq(schema.blogPosts.status, 'PUBLISHED'),
    orderBy: desc(schema.blogPosts.publishedAt),
    columns: {
      id: true,
      slug: true,
      title: true,
      description: true,
      publishedAt: true,
      readingTime: true,
      tags: true,
    },
    with: {
      author: {
        columns: {
          name: true,
        },
      },
    },
  });

  return posts;
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Blog</h1>
          <p className="text-lg text-muted-foreground">
            Insights, updates, and guides for entrepreneurs and business builders.
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No posts yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      {post.publishedAt && (
                        <time dateTime={post.publishedAt.toISOString()}>
                          {post.publishedAt.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </time>
                      )}
                      {post.readingTime && (
                        <>
                          <span className="mx-2">·</span>
                          <Clock className="h-4 w-4" />
                          <span>{post.readingTime}</span>
                        </>
                      )}
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-center justify-between">
                      {post.title}
                      <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </CardTitle>
                    {post.description && (
                      <CardDescription className="line-clamp-2">{post.description}</CardDescription>
                    )}
                  </CardHeader>
                  {post.tags && post.tags.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="default">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

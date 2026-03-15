import Link from 'next/link';
import { db, schema } from '@forge/server';
import { eq, desc } from 'drizzle-orm';
import { BlogCover } from '@/components/blog/BlogCover';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3006';

export const metadata = {
  title: 'Blog | Idea Fuel',
  description: 'Insights, updates, and guides for entrepreneurs and business builders.',
  openGraph: {
    title: 'Blog | Idea Fuel',
    description: 'Insights, updates, and guides for entrepreneurs and business builders.',
    images: [{ url: `${baseUrl}/api/og?title=Idea+Fuel+Blog`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Blog | Idea Fuel',
    description: 'Insights, updates, and guides for entrepreneurs and business builders.',
    images: [`${baseUrl}/api/og?title=Idea+Fuel+Blog`],
  },
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
      coverImage: true,
      publishedAt: true,
      readingTime: true,
      tags: true,
    },
    with: {
      author: {
        columns: {
          name: true,
          image: true,
        },
      },
    },
  });

  return posts;
}

async function getTags() {
  const posts = await db.query.blogPosts.findMany({
    where: eq(schema.blogPosts.status, 'PUBLISHED'),
    columns: { tags: true },
  });

  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function AuthorAvatar({ name, image }: { name: string; image?: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-6 h-6 rounded-full bg-[#E8513D]/20 text-[#E8513D] flex items-center justify-center text-[10px] font-semibold ring-1 ring-white/10">
      {initials}
    </div>
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const params = await searchParams;
  const activeTag = params.tag;
  const [allPosts, tags] = await Promise.all([getPosts(), getTags()]);

  const posts = activeTag
    ? allPosts.filter((p) => p.tags?.includes(activeTag))
    : allPosts;

  const featured = !activeTag ? posts[0] : null;
  const gridPosts = !activeTag ? posts.slice(1) : posts;

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">

        {/* ── Header ── */}
        <header className="mb-14">
          <h1 className="font-display text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
            Blog
          </h1>
          <p className="text-lg text-[#928e87] max-w-xl">
            Insights, updates, and guides for entrepreneurs and business builders.
          </p>
        </header>

        {/* ── Tag Filter ── */}
        {tags.length > 0 && (
          <nav className="mb-12 flex flex-wrap gap-2" aria-label="Filter by tag">
            <Link
              href="/blog"
              className={`
                px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200
                ${!activeTag
                  ? 'bg-white text-[#161513]'
                  : 'text-[#928e87] border border-[#333] hover:border-[#555] hover:text-white'
                }
              `}
            >
              All
            </Link>
            {tags.map(({ tag }) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className={`
                  px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200
                  ${activeTag === tag
                    ? 'bg-white text-[#161513]'
                    : 'text-[#928e87] border border-[#333] hover:border-[#555] hover:text-white'
                  }
                `}
              >
                {tag}
              </Link>
            ))}
          </nav>
        )}

        {/* ── Featured Post ── */}
        {featured && (
          <Link href={`/blog/${featured.slug}`} className="group block mb-12">
            <article className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-[#2a2a2a] bg-[#1c1b19] transition-all duration-300 hover:border-[#E8513D]/30 hover:shadow-[0_0_60px_-15px_rgba(232,81,61,0.15)]">
              {/* Cover — no text overlay, info panel handles it */}
              <div className="relative overflow-hidden">
                {featured.coverImage ? (
                  <img
                    src={featured.coverImage}
                    alt={featured.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    style={{ aspectRatio: '16/10' }}
                  />
                ) : (
                  <BlogCover
                    slug={featured.slug}
                    hideOverlay
                    className="!rounded-none h-full"
                  />
                )}
              </div>

              {/* Info panel */}
              <div className="flex flex-col justify-center p-8 md:p-10">
                {featured.tags?.[0] && (
                  <span className="inline-block w-fit mb-4 px-2.5 py-1 rounded-md text-[11px] font-medium tracking-wide text-[#E8513D] bg-[#E8513D]/10">
                    {featured.tags[0]}
                  </span>
                )}
                <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-[1.15] mb-3 group-hover:text-[#E8513D] transition-colors duration-200">
                  {featured.title}
                </h2>
                {featured.description && (
                  <p className="text-[#928e87] text-[15px] leading-relaxed line-clamp-3 mb-6">
                    {featured.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-auto">
                  {featured.author && (
                    <>
                      <AuthorAvatar
                        name={featured.author.name ?? 'Author'}
                        image={featured.author.image}
                      />
                      <span className="text-sm text-white/70">
                        {featured.author.name}
                      </span>
                    </>
                  )}
                  {featured.publishedAt && (
                    <>
                      <span className="text-[#555]">·</span>
                      <time className="text-sm text-[#928e87]" dateTime={featured.publishedAt.toISOString()}>
                        {formatDate(featured.publishedAt)}
                      </time>
                    </>
                  )}
                </div>
              </div>
            </article>
          </Link>
        )}

        {/* ── Post Grid ── */}
        {gridPosts.length === 0 && !featured ? (
          <div className="py-24 text-center">
            <p className="text-[#928e87] text-lg">
              {activeTag ? `No posts tagged "${activeTag}" yet.` : 'No posts yet. Check back soon!'}
            </p>
            {activeTag && (
              <Link href="/blog" className="inline-block mt-4 text-[#E8513D] hover:underline text-sm">
                View all posts
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block"
              >
                <article className="h-full flex flex-col rounded-2xl overflow-hidden border border-[#2a2a2a] bg-[#1c1b19] transition-all duration-300 hover:border-[#E8513D]/30 hover:shadow-[0_0_40px_-12px_rgba(232,81,61,0.1)] hover:-translate-y-0.5">
                  {/* Cover */}
                  <div className="relative overflow-hidden">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        style={{ aspectRatio: '16/10' }}
                      />
                    ) : (
                      <BlogCover
                        slug={post.slug}
                        title={post.title}
                        tag={post.tags?.[0]}
                        className="!rounded-none"
                      />
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      {post.author && (
                        <>
                          <AuthorAvatar
                            name={post.author.name ?? 'Author'}
                            image={post.author.image}
                          />
                          <span className="text-[13px] text-white/60">
                            {post.author.name}
                          </span>
                        </>
                      )}
                      {post.publishedAt && (
                        <>
                          <span className="text-[#444]">·</span>
                          <time className="text-[13px] text-[#928e87]" dateTime={post.publishedAt.toISOString()}>
                            {formatDate(post.publishedAt)}
                          </time>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

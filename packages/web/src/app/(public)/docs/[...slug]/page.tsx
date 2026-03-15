import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDocBySlug, getAllDocSlugs, NAV_ITEMS, type NavItem } from '@/lib/docs';
import { DocsMarkdown } from '@/components/docs/docs-markdown';
import { DocsToc } from '@/components/docs/docs-toc';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const slugs = getAllDocSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return {};

  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    keywords: doc.frontmatter.keywords,
    openGraph: {
      title: doc.frontmatter['og:title'] || doc.frontmatter.title,
      description: doc.frontmatter['og:description'] || doc.frontmatter.description,
      type: 'article',
    },
  };
}

// Find prev/next links from flat nav
function flattenNav(items: NavItem[]): NavItem[] {
  const flat: NavItem[] = [];
  for (const item of items) {
    flat.push(item);
    if (item.children) {
      flat.push(...item.children);
    }
  }
  return flat;
}

function buildDocJsonLd(doc: { frontmatter: import('@/lib/docs').DocFrontmatter; slug: string[] }) {
  const url = `https://ideafuel.ai/docs/${doc.slug.join('/')}`;
  const schemaType = doc.frontmatter.structured_data?.type || 'Article';

  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    headline: doc.frontmatter.title,
    description: doc.frontmatter.description,
    url,
    publisher: { '@id': 'https://ideafuel.ai/#organization' },
    isPartOf: { '@id': 'https://ideafuel.ai/#website' },
  };

  if (doc.frontmatter.keywords) {
    base.keywords = doc.frontmatter.keywords;
  }

  return base;
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  // Prev/next navigation
  const flatNav = flattenNav(NAV_ITEMS);
  const currentHref = `/docs/${slug.join('/')}`;
  const currentIndex = flatNav.findIndex((n) => n.href === currentHref);
  const prev = currentIndex > 0 ? flatNav[currentIndex - 1] : null;
  const next = currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : null;

  const jsonLd = buildDocJsonLd(doc);

  return (
    <div className="flex gap-10 px-6 py-12 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Main content */}
      <article className="min-w-0 max-w-[720px] flex-1">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-[11px] uppercase tracking-[1.5px]">
          <Link
            href="/docs"
            className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
          >
            Docs
          </Link>
          {slug.map((segment, i) => (
            <span key={segment} className="flex items-center gap-1.5">
              <span className="text-[hsl(var(--border))]">/</span>
              {i === slug.length - 1 ? (
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {segment.replace(/-/g, ' ')}
                </span>
              ) : (
                <Link
                  href={`/docs/${slug.slice(0, i + 1).join('/')}`}
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
                >
                  {segment.replace(/-/g, ' ')}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Content */}
        <DocsMarkdown content={doc.content} />

        {/* Prev/Next navigation */}
        <div className="mt-16 flex items-stretch gap-3 border-t border-[hsl(var(--border))] pt-8">
          {prev ? (
            <Link
              href={prev.href}
              className="group flex flex-1 flex-col rounded-xl border border-[hsl(var(--border))] p-4 transition-all duration-200 hover:border-[#e32b1a]/30 hover:bg-[hsl(var(--muted)/.3)]"
            >
              <span className="text-[10px] font-medium uppercase tracking-[1.5px] text-[hsl(var(--muted-foreground))]">
                Previous
              </span>
              <span className="mt-1 text-sm font-medium text-[hsl(var(--foreground))] transition-colors group-hover:text-[#e32b1a]">
                ← {prev.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <Link
              href={next.href}
              className="group flex flex-1 flex-col items-end rounded-xl border border-[hsl(var(--border))] p-4 text-right transition-all duration-200 hover:border-[#e32b1a]/30 hover:bg-[hsl(var(--muted)/.3)]"
            >
              <span className="text-[10px] font-medium uppercase tracking-[1.5px] text-[hsl(var(--muted-foreground))]">
                Next
              </span>
              <span className="mt-1 text-sm font-medium text-[hsl(var(--foreground))] transition-colors group-hover:text-[#e32b1a]">
                {next.title} →
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </article>

      {/* Table of contents */}
      <DocsToc content={doc.content} />
    </div>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllTerms, getTermBySlug } from '@/lib/glossary';
import { GlossaryRelatedChips } from '@/components/glossary/glossary-related-chips';
import { GlossaryCta } from '@/components/glossary/glossary-cta';
import { GlossaryCopyLink } from '@/components/glossary/glossary-copy-link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const terms = getAllTerms();
  return terms.map((term) => ({ slug: term.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const term = getTermBySlug(slug);
  if (!term) return {};

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3006';
  const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent(term.title)}`;

  return {
    title: term.seoTitle,
    description: term.seoDescription,
    openGraph: {
      title: term.seoTitle,
      description: term.seoDescription,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: term.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: term.seoTitle,
      description: term.seoDescription,
      images: [ogImage],
    },
  };
}

export default async function GlossaryTermPage({ params }: PageProps) {
  const { slug } = await params;
  const term = getTermBySlug(slug);

  if (!term) {
    notFound();
  }

  // Prev/next (alphabetical)
  const allTerms = getAllTerms();
  const currentIndex = allTerms.findIndex((t) => t.slug === slug);
  const prev = currentIndex > 0 ? allTerms[currentIndex - 1] : null;
  const next = currentIndex < allTerms.length - 1 ? allTerms[currentIndex + 1] : null;

  const categoryLabel = term.category.charAt(0).toUpperCase() + term.category.slice(1);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term.title,
    description: term.content.definition,
    url: `https://ideafuel.ai/glossary/${slug}`,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'IdeaFuel Startup & Marketing Glossary',
      url: 'https://ideafuel.ai/glossary',
    },
    publisher: { '@id': 'https://ideafuel.ai/#organization' },
    isPartOf: { '@id': 'https://ideafuel.ai/#website' },
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl px-6 py-16">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-1.5 text-[11px] uppercase tracking-[1.5px]">
          <Link
            href="/glossary"
            className="text-[#928e87] transition-colors hover:text-white"
          >
            Glossary
          </Link>
          <span className="text-[#555]">/</span>
          <span className="font-medium text-white">{term.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              {term.title}
            </h1>
            <GlossaryCopyLink />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#333] px-2.5 py-0.5 text-[11px] font-medium text-[#928e87]">
              {categoryLabel}
            </span>
            {term.synonyms.length > 0 && (
              <span className="text-sm text-[#928e87]">
                Also known as: {term.synonyms.join(', ')}
              </span>
            )}
          </div>
        </header>

        {/* Content sections */}
        <div className="space-y-10">
          {/* Definition */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-white">
              What is {term.title}?
            </h2>
            <p className="text-[15px] leading-relaxed text-[#c4c0b9]">
              {term.content.definition}
            </p>
          </section>

          {/* Why it matters */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-white">Why It Matters</h2>
            <p className="text-[15px] leading-relaxed text-[#c4c0b9]">
              {term.content.whyItMatters}
            </p>
          </section>

          {/* How to apply */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-white">How to Apply</h2>
            <p className="text-[15px] leading-relaxed text-[#c4c0b9]">
              {term.content.howToApply}
            </p>
          </section>

          {/* Common mistakes */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-white">Common Mistakes</h2>
            <ul className="space-y-2">
              {term.content.commonMistakes.map((mistake, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-[#c4c0b9]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E8513D]" />
                  {mistake}
                </li>
              ))}
            </ul>
          </section>

          {/* IdeaFuel connection */}
          {term.content.ideafuelConnection && (
            <section className="rounded-xl border border-[#E8513D]/20 bg-[#E8513D]/5 px-6 py-5">
              <h2 className="mb-2 text-lg font-bold text-white">
                How IdeaFuel Helps
              </h2>
              <p className="text-[15px] leading-relaxed text-[#c4c0b9]">
                {term.content.ideafuelConnection}
              </p>
            </section>
          )}

          {/* Related terms */}
          {term.relatedTerms.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-white">Related Terms</h2>
              <GlossaryRelatedChips slugs={term.relatedTerms} />
            </section>
          )}

          {/* CTA */}
          <GlossaryCta />

          {/* Prev/Next navigation */}
          {(prev || next) && (
            <nav className="flex items-stretch gap-3 border-t border-[#333] pt-8">
              {prev ? (
                <Link
                  href={`/glossary/${prev.slug}`}
                  className="group flex flex-1 flex-col rounded-xl border border-[#333] p-4 transition-all duration-200 hover:border-[#E8513D]/30 hover:bg-[#1c1b19]"
                >
                  <span className="text-[10px] font-medium uppercase tracking-[1.5px] text-[#928e87]">
                    Previous
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-sm font-medium text-white transition-colors group-hover:text-[#E8513D]">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {next ? (
                <Link
                  href={`/glossary/${next.slug}`}
                  className="group flex flex-1 flex-col items-end rounded-xl border border-[#333] p-4 text-right transition-all duration-200 hover:border-[#E8513D]/30 hover:bg-[#1c1b19]"
                >
                  <span className="text-[10px] font-medium uppercase tracking-[1.5px] text-[#928e87]">
                    Next
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-sm font-medium text-white transition-colors group-hover:text-[#E8513D]">
                    {next.title}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
            </nav>
          )}
        </div>
      </article>
    </div>
  );
}

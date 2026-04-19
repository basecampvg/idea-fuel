// packages/web/src/app/(public)/glossary/page.tsx
import type { Metadata } from 'next';
import { getAllTerms } from '@/lib/glossary';
import { GlossaryIndexClient } from '@/components/glossary/glossary-index-client';

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.AUTH_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://ideafuel.ai' : 'http://localhost:3006');

export const metadata: Metadata = {
  title: 'Startup & Marketing Glossary | IdeaFuel',
  description:
    'The founder\'s dictionary. 250+ startup, marketing, and business terms every entrepreneur should know.',
  openGraph: {
    title: 'Startup & Marketing Glossary | IdeaFuel',
    description:
      'The founder\'s dictionary. 250+ startup, marketing, and business terms every entrepreneur should know.',
    images: [{ url: `${baseUrl}/api/og?title=Startup+%26+Marketing+Glossary`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Startup & Marketing Glossary | IdeaFuel',
    description:
      'The founder\'s dictionary. 250+ startup, marketing, and business terms every entrepreneur should know.',
    images: [`${baseUrl}/api/og?title=Startup+%26+Marketing+Glossary`],
  },
};

export default function GlossaryPage() {
  const terms = getAllTerms();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'IdeaFuel Startup & Marketing Glossary',
    description:
      'A comprehensive glossary of startup, marketing, and business validation terms for entrepreneurs.',
    url: 'https://ideafuel.ai/glossary',
    publisher: { '@id': 'https://ideafuel.ai/#organization' },
    isPartOf: { '@id': 'https://ideafuel.ai/#website' },
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        {/* Hero */}
        <header className="mb-14">
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-white md:text-6xl">
            Glossary
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[#928e87]">
            The founder&apos;s dictionary. {terms.length}+ terms every entrepreneur should know.
          </p>
        </header>

        <GlossaryIndexClient terms={terms} />
      </div>
    </div>
  );
}

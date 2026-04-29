import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

export const metadata: Metadata = {
  title: 'IdeaFuel: Turn Your Ideas into Validated Businesses',
  description:
    'AI-powered business idea validation. Capture ideas on mobile, let AI research your market, and get a full business plan in days, not months. Built on 100 years of creativity research.',
  metadataBase: new URL('https://ideafuel.ai'),
  keywords: [
    'business idea validation',
    'validate business idea',
    'ai business plan',
    'startup idea generator',
    'business plan generator',
    'idea validation tool',
    'business idea app',
    'validate startup idea',
  ],
  openGraph: {
    title: 'IdeaFuel: Turn Your Ideas into Validated Businesses',
    description:
      'AI-powered business idea validation. Capture ideas on mobile, research your market with AI, and get a validated business plan in days.',
    url: 'https://ideafuel.ai',
    siteName: 'IdeaFuel',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IdeaFuel: Turn Your Ideas into Validated Businesses',
    description:
      'AI-powered business idea validation. Capture ideas on mobile, research your market with AI, and get a validated business plan in days.',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

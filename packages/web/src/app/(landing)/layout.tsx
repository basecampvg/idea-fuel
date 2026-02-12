import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IdeationLab — Validate Your Business Idea with AI',
  description:
    'Stop guessing. IdeationLab uses AI-powered deep research to validate your business idea in minutes. Market analysis, competitor intel, and timing signals.',
  metadataBase: new URL('https://ideationlab.ai'),
  openGraph: {
    title: 'IdeationLab — Validate Your Business Idea with AI',
    description:
      'Stop guessing. AI-powered market research validates your business idea in minutes, not months.',
    url: 'https://ideationlab.ai',
    siteName: 'IdeationLab',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IdeationLab — Validate Your Business Idea with AI',
    description:
      'Stop guessing. AI-powered market research validates your business idea in minutes, not months.',
  },
};

/**
 * Landing page layout - minimal header, no sidebar
 * Used for root domain (ideationlab.ai)
 */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary"
            >
              <path
                d="M16 2L4 28h8l4-12 4 12h8L16 2z"
                fill="currentColor"
                fillOpacity="0.9"
              />
              <path
                d="M16 8l-6 16h4l2-6 2 6h4L16 8z"
                fill="currentColor"
                fillOpacity="0.5"
              />
            </svg>
            <span className="font-display text-xl font-semibold tracking-tight text-foreground">
              IdeationLab
            </span>
          </Link>

          {/* CTA */}
          <Link
            href={
              process.env.NODE_ENV === 'production'
                ? `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ideationlab.ai'}`
                : '/dashboard'
            }
            className="btn-ideationlab"
          >
            Launch App
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} IdeationLab. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/blog"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Blog
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

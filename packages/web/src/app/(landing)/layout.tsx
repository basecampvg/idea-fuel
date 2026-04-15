import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IdeaFuel — Turn Your Ideas into Validated Businesses',
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
    title: 'IdeaFuel — Turn Your Ideas into Validated Businesses',
    description:
      'AI-powered business idea validation. Capture ideas on mobile, research your market with AI, and get a validated business plan in days.',
    url: 'https://ideafuel.ai',
    siteName: 'IdeaFuel',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IdeaFuel — Turn Your Ideas into Validated Businesses',
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
      {/* Fixed nav */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#1a1a1a] bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[88px] max-w-[1400px] items-center justify-between px-6 lg:px-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/ideafuel-logo.svg"
              alt="IdeaFuel"
              className="h-8 w-auto"
            />
            <span className="font-mono text-xl font-medium uppercase tracking-[3px]">
              <span className="text-white">idea</span>
              <span className="text-gradient-brand">fuel</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-1 sm:flex">
            <a
              href="#how-it-works"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#a8a49e] transition-colors hover:text-white"
            >
              How It Works
            </a>
            <Link
              href="/demo-report"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#a8a49e] transition-colors hover:text-white"
            >
              Sample Report
            </Link>
            <a
              href="#pricing"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#a8a49e] transition-colors hover:text-white"
            >
              Pricing
            </a>
            <a
              href="#"
              className="ml-2 rounded-full bg-[#e32b1a] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[#c82617] hover:shadow-[0_0_20px_rgba(227,43,26,0.3)]"
            >
              Get the App
            </a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-12">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-16">
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img
                src="/ideafuel-logo.svg"
                alt="IdeaFuel"
                className="h-6 w-auto opacity-50"
              />
              <span className="font-mono text-sm font-medium uppercase tracking-[2px] text-[#3a3835]">
                ideafuel
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="text-sm text-[#6b6862] transition-colors hover:text-[#a8a49e]"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-[#6b6862] transition-colors hover:text-[#a8a49e]"
              >
                Terms
              </Link>
              <Link
                href="/blog"
                className="text-sm text-[#6b6862] transition-colors hover:text-[#a8a49e]"
              >
                Blog
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-sm text-[#3a3835]">
              &copy; {new Date().getFullYear()} IdeaFuel
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Idea Fuel — Stop Guessing. Start Building.',
  description:
    'Idea Fuel replaces the chaos with structured interviews, real research, and comprehensive reports you can put to use immediately.',
  metadataBase: new URL('https://ideafuel.ai'),
  openGraph: {
    title: 'Idea Fuel — Stop Guessing. Start Building.',
    description:
      'Structured interviews, real research, and comprehensive reports to validate your business idea.',
    url: 'https://ideafuel.ai',
    siteName: 'Idea Fuel',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Idea Fuel — Stop Guessing. Start Building.',
    description:
      'Structured interviews, real research, and comprehensive reports to validate your business idea.',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Fixed nav — outside ScrollSmoother */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#333] bg-[#0A0A0A]">
        <div className="mx-auto flex h-[88px] max-w-[1800px] items-center justify-between px-6 lg:px-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/ideafuel-logo.svg"
              alt="Idea Fuel"
              className="h-8 w-auto"
            />
            {/* Brand text */}
            <span className="font-mono text-xl font-medium uppercase tracking-[3px]">
              <span className="text-white">idea</span>
              <span className="text-gradient-brand">fuel</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-0 sm:flex">
            <Link
              href="/#how-it-works"
              className="px-5 py-2 text-sm font-semibold uppercase tracking-[1px] text-white transition-colors hover:text-[#e32b1a]"
            >
              How It Works
            </Link>
            <Link
              href="/demo-report"
              className="px-5 py-2 text-sm font-semibold uppercase tracking-[1px] text-white transition-colors hover:text-[#e32b1a]"
            >
              Sample Report
            </Link>
            <a
              href="#start"
              className="ml-2 px-5 py-2 text-sm font-semibold uppercase tracking-[1px] text-gradient-brand transition-opacity hover:opacity-80"
            >
              Start for Free
            </a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#333] py-8">
        <div className="mx-auto flex max-w-[1800px] flex-col items-center justify-between gap-4 px-6 sm:flex-row lg:px-20">
          <p className="text-sm text-[#928e87]">
            &copy; {new Date().getFullYear()} Idea Fuel. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-sm text-[#928e87] transition-colors hover:text-white"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-[#928e87] transition-colors hover:text-white"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

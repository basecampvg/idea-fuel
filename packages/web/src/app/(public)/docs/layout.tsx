import type { Metadata } from 'next';
import Link from 'next/link';
import { DocsSidebar } from '@/components/docs/docs-sidebar';

export const metadata: Metadata = {
  title: {
    default: 'Documentation | Idea Fuel',
    template: '%s | Idea Fuel Docs',
  },
  description:
    'Learn how to validate your business idea with IdeaFuel — AI-powered interviews, market research, financial modeling, and business plan generation.',
  openGraph: {
    title: 'IdeaFuel Documentation',
    description:
      'Comprehensive guides for validating business ideas with AI-powered research, reports, and financial modeling.',
    type: 'website',
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[88px] max-w-[1800px] items-center justify-between px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/ideafuel-logo.svg"
                alt="Idea Fuel"
                className="h-7 w-auto"
              />
              <span className="font-mono text-lg font-medium uppercase tracking-[3px]">
                <span className="text-[hsl(var(--foreground))]">idea</span>
                <span className="text-gradient-brand">fuel</span>
              </span>
            </Link>

            {/* Divider */}
            <div className="hidden h-5 w-px bg-[hsl(var(--border))] sm:block" />

            {/* Docs badge */}
            <Link
              href="/docs"
              className="hidden items-center gap-1.5 text-[11px] font-medium uppercase tracking-[2px] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] sm:flex"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Docs
            </Link>
          </div>

          {/* Right nav */}
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="px-4 py-2 text-xs font-semibold uppercase tracking-[1px] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              Home
            </Link>
            <Link
              href="/auth/signin"
              className="rounded-full bg-[#e32b1a] px-5 py-2 text-xs font-semibold uppercase tracking-[1px] text-white shadow-[0_0_20px_rgba(227,43,26,0.3)] transition-all hover:shadow-[0_0_30px_rgba(227,43,26,0.5)] hover:-translate-y-px"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Body */}
      <div className="flex pt-[88px]">
        <DocsSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

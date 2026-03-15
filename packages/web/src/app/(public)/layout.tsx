import Link from 'next/link';
import { Button } from '@/components/ui/button';

const appUrl =
  process.env.NEXT_PUBLIC_APP_SUBDOMAIN
    ? `https://${process.env.NEXT_PUBLIC_APP_SUBDOMAIN}`
    : process.env.NEXT_PUBLIC_APP_URL ?? '/dashboard';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#161513]">
      {/* Header — matches landing page brand */}
      <header className="border-b border-[#333] bg-[#161513]">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/ideafuel-logo.svg"
              alt="Idea Fuel"
              className="h-7 w-auto"
            />
            <span className="font-mono text-lg font-medium uppercase tracking-[3px]">
              <span className="text-white">idea</span>
              <span className="text-gradient-brand">fuel</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            <Link
              href="/blog"
              className="px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Blog
            </Link>
            <Link
              href="/docs"
              className="px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Docs
            </Link>
            <a href={appUrl}>
              <Button size="sm" className="ml-2">
                Dashboard
              </Button>
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#333] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p className="text-sm text-[#928e87]">
            &copy; {new Date().getFullYear()} Idea Fuel. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-[#928e87] transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-[#928e87] transition-colors hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

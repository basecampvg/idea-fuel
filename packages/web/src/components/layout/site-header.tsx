import Link from 'next/link';
import { MegaMenu } from '@/app/(landing)/components/mega-menu';
import { MobileMenu } from '@/app/(landing)/components/mobile-menu';

export function SiteHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#1a1a1a] bg-[#0A0A0A]/90 backdrop-blur-md">
      <div className="mx-auto flex h-[88px] max-w-[1400px] items-center justify-between px-6 lg:px-16">
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

        <MegaMenu />

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/auth/signin"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#a8a49e] transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <a
            href="#"
            className="rounded-full bg-[#e32b1a] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[#c82617] hover:shadow-[0_0_20px_rgba(227,43,26,0.3)]"
          >
            Get the App
          </a>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}

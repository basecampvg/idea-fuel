import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-[#1a1a1a] py-12">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-16">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
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

          <p className="text-sm text-[#3a3835]">
            &copy; {new Date().getFullYear()} IdeaFuel
          </p>
        </div>
      </div>
    </footer>
  );
}

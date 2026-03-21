import Link from 'next/link';
import { MegaNav } from '@/components/navigation/mega-nav';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#161513]">
      <MegaNav variant="public" />

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

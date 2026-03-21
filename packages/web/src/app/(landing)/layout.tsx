import type { Metadata } from 'next';
import Link from 'next/link';
import { MegaNav } from '@/components/navigation/mega-nav';

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
    <div className="min-h-screen bg-[#161513]">
      <MegaNav variant="landing" />

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
              href="#"
              className="text-sm text-[#928e87] transition-colors hover:text-white"
            >
              Privacy
            </Link>
            <Link
              href="#"
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

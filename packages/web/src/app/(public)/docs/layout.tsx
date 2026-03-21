import type { Metadata } from 'next';
import { DocsSidebar } from '@/components/docs/docs-sidebar';
import { MegaNav } from '@/components/navigation/mega-nav';

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
    <div className="min-h-screen bg-[#161513]">
      <MegaNav variant="docs" />

      {/* Body */}
      <div className="flex pt-[72px]">
        <DocsSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

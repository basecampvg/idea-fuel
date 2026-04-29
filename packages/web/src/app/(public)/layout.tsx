import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SiteHeader />
      <main className="pt-[88px]">{children}</main>
      <SiteFooter />
    </div>
  );
}

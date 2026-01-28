import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { DashboardProviders } from '@/components/providers/dashboard-providers';

// DEV BYPASS: Skip auth check in development
const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session && !DEV_BYPASS_AUTH) {
    redirect('/auth/signin');
  }

  return (
    <DashboardProviders>
      <div className="min-h-screen aurora-background">
        <Sidebar />
        {/* Main content is truly centered in viewport, sidebar overlays */}
        <main className="min-h-screen flex flex-col relative z-10">
          {children}
        </main>
      </div>
    </DashboardProviders>
  );
}

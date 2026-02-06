import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ConditionalSidebar } from '@/components/layout/conditional-sidebar';
import { DashboardProviders } from '@/components/providers/dashboard-providers';
import { DashboardMain } from '@/components/layout/dashboard-main';

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
        <ConditionalSidebar />
        <DashboardMain>{children}</DashboardMain>
      </div>
    </DashboardProviders>
  );
}

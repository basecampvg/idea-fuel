import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ConditionalSidebar } from '@/components/layout/conditional-sidebar';
import { ConditionalTopNavBar } from '@/components/layout/conditional-top-nav-bar';
import { DashboardProviders } from '@/components/providers/dashboard-providers';
import { DashboardMain } from '@/components/layout/dashboard-main';
import { AgentSidebar } from '@/components/agent/agent-sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <DashboardProviders>
      <div className="min-h-screen aurora-background">
        <ConditionalTopNavBar />
        <ConditionalSidebar />
        <DashboardMain>{children}</DashboardMain>
        <AgentSidebar />
      </div>
    </DashboardProviders>
  );
}

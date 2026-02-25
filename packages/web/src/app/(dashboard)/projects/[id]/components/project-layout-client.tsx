'use client';

import { use, Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import { ProjectSecondaryNav } from './project-secondary-nav';
import { ProjectHeader } from './project-header';
import { ProjectDashboardNav, DASHBOARD_NAV_HEIGHT } from './project-dashboard-nav';
import { useAgentSidebar } from '@/components/agent/agent-sidebar-context';

const SECONDARY_NAV_WIDTH = 240;

function ProjectLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  // Only hide sidebar for the active interview chat, not interview-summary
  const isInterviewPage = pathname?.endsWith('/interview');
  const { setProjectId } = useAgentSidebar();

  // Sync project ID to agent sidebar context
  useEffect(() => {
    setProjectId(id);
    return () => setProjectId(null);
  }, [id, setProjectId]);

  const { data: project, isLoading, error } = trpc.project.get.useQuery(
    { id },
    {
      refetchInterval: (query) =>
        query.state.data?.status === 'RESEARCHING' ? 15000 : false,
    }
  );

  if (isLoading) {
    return <LoadingScreen message="Loading project..." />;
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card p-6 border-red-500/30 max-w-md">
          <p className="text-red-400">{error?.message || 'Project not found'}</p>
          <a
            href="/projects"
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Vault
          </a>
        </div>
      </div>
    );
  }

  // Interview page gets full-width, no sidebar
  if (isInterviewPage) {
    return <>{children}</>;
  }

  return (
    <>
      <ProjectSecondaryNav project={project} />
      <div className="min-h-screen" style={{ marginLeft: SECONDARY_NAV_WIDTH, paddingTop: DASHBOARD_NAV_HEIGHT }}>
        <ProjectDashboardNav projectId={project.id} />
        <div className="max-w-[1120px] mx-auto px-6 py-8 space-y-6">
          <ProjectHeader project={project} />
          {children}
        </div>
      </div>
    </>
  );
}

export function ProjectLayoutClient({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ marginLeft: SECONDARY_NAV_WIDTH }}>
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <ProjectLayoutInner params={params}>{children}</ProjectLayoutInner>
    </Suspense>
  );
}

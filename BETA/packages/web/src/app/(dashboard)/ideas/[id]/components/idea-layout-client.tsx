'use client';

import { use, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import { IdeaSecondaryNav } from './idea-secondary-nav';
import { IdeaHeader } from './idea-header';

function IdeaLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const isInterviewPage = pathname?.includes('/interview');

  const { data: idea, isLoading, error } = trpc.idea.get.useQuery(
    { id },
    {
      refetchInterval: (query) =>
        query.state.data?.status === 'RESEARCHING' ? 3000 : false,
    }
  );

  if (isLoading) {
    return <LoadingScreen message="Loading idea..." />;
  }

  if (error || !idea) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card p-6 border-red-500/30 max-w-md">
          <p className="text-red-400">{error?.message || 'Idea not found'}</p>
          <a
            href="/ideas"
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
      <IdeaSecondaryNav idea={idea} />
      <div className="ml-[240px] min-h-screen">
        <div className="max-w-[1120px] mx-auto px-6 py-8 space-y-6">
          <IdeaHeader idea={idea} />
          {children}
        </div>
      </div>
    </>
  );
}

export function IdeaLayoutClient({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="ml-[240px] flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <IdeaLayoutInner params={params}>{children}</IdeaLayoutInner>
    </Suspense>
  );
}

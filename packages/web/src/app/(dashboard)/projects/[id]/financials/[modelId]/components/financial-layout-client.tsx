'use client';

import { use, Suspense } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import { FinancialBreadcrumb } from './financial-breadcrumb';

function FinancialLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; modelId: string }>;
}) {
  const { id: projectId, modelId } = use(params);

  const { data: model, isLoading, error } = trpc.financial.get.useQuery({ id: modelId });

  if (isLoading) {
    return <LoadingScreen message="Loading financial model..." />;
  }

  if (error || !model) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-card p-6 max-w-md">
        <p className="text-destructive">{error?.message || 'Financial model not found'}</p>
        <Link
          href={`/projects/${projectId}/financials`}
          className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Models
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FinancialBreadcrumb modelId={model.id} modelName={model.name} projectId={projectId} />
      {children}
    </div>
  );
}

export function FinancialLayoutClient({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; modelId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <FinancialLayoutInner params={params}>{children}</FinancialLayoutInner>
    </Suspense>
  );
}

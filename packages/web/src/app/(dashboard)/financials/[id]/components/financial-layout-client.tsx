'use client';

import { use, Suspense } from 'react';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import { FinancialSecondaryNav } from './financial-secondary-nav';
import { FinancialBreadcrumb } from './financial-breadcrumb';

const SECONDARY_NAV_WIDTH = 240;

function FinancialLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: model, isLoading, error } = trpc.financial.get.useQuery({ id });

  if (isLoading) {
    return <LoadingScreen message="Loading financial model..." />;
  }

  if (error || !model) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-destructive/30 bg-card p-6 max-w-md">
          <p className="text-destructive">{error?.message || 'Financial model not found'}</p>
          <a
            href="/financials"
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Models
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <FinancialSecondaryNav model={model} />
      <div className="min-h-screen" style={{ marginLeft: SECONDARY_NAV_WIDTH }}>
        <div className="max-w-[1120px] mx-auto px-6 py-8 space-y-6">
          <FinancialBreadcrumb modelId={model.id} modelName={model.name} />
          {children}
        </div>
      </div>
    </>
  );
}

export function FinancialLayoutClient({
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
      <FinancialLayoutInner params={params}>{children}</FinancialLayoutInner>
    </Suspense>
  );
}

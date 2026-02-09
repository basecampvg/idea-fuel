'use client';

import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Suspense, useCallback } from 'react';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'ai';

  const { data: categories } = trpc.admin.categories.useQuery();

  // Build category counts from server data
  const categoryCounts: Record<string, number> = {};
  if (categories) {
    categories.forEach((cat) => {
      categoryCounts[cat.id] = cat.count;
    });
  }

  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.push(`/admin?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <>
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        categoryCounts={categoryCounts}
      />
      {/* Main content area with left margin for sidebar */}
      <div className="ml-[260px] min-h-screen bg-background">{children}</div>
    </>
  );
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="ml-[260px] flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  );
}

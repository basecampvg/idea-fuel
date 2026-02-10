'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@forge/server';

type RouterOutput = inferRouterOutputs<AppRouter>;
export type ProjectGetOutput = RouterOutput['project']['get'];

export function useProjectSection<T>(
  selector: (project: ProjectGetOutput) => T | null | undefined
) {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = trpc.project.get.useQuery(
    { id: params.id },
    { select: selector }
  );
  return { data: data ?? null, isLoading };
}

export function useProject() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = trpc.project.get.useQuery({ id: params.id });
  return { project: data ?? null, isLoading };
}

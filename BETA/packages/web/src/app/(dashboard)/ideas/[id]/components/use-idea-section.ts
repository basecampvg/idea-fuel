'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@forge/server';

type RouterOutput = inferRouterOutputs<AppRouter>;
export type IdeaGetOutput = RouterOutput['idea']['get'];

export function useIdeaSection<T>(
  selector: (idea: IdeaGetOutput) => T | null | undefined
) {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = trpc.idea.get.useQuery(
    { id: params.id },
    { select: selector }
  );
  return { data: data ?? null, isLoading };
}

export function useIdea() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = trpc.idea.get.useQuery({ id: params.id });
  return { idea: data ?? null, isLoading };
}

'use client';

import { use } from 'react';
import { trpc } from '@/lib/trpc/client';
import { CanvasEditor } from './components/canvas-editor';
import { LoadingScreen } from '@/components/ui/spinner';

export default function ProjectCanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project, isLoading } = trpc.project.get.useQuery({ id });

  if (isLoading || !project) {
    return <LoadingScreen message="Loading canvas..." />;
  }

  return <CanvasEditor project={project} />;
}

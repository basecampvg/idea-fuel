'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import { IdeaHeader } from './components/idea-header';
import { StatusCaptured } from './components/status-captured';
import { StatusInterviewing } from './components/status-interviewing';
import { StatusResearching } from './components/status-researching';
import { StatusComplete } from './components/status-complete';

export default function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: idea, isLoading, error } = trpc.idea.get.useQuery({ id });

  const deleteIdea = trpc.idea.delete.useMutation({
    onSuccess: () => {
      router.push('/ideas');
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this idea? This cannot be undone.')) {
      deleteIdea.mutate({ id });
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading idea..." />;
  }

  if (error || !idea) {
    return (
      <div className="glass-card p-6 border-red-500/30">
        <p className="text-red-400">{error?.message || 'Idea not found'}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 max-w-[1120px] mx-auto px-6 py-8">
      {/* Header */}
      <IdeaHeader idea={idea} />

      {/* Status-specific content */}
      {idea.status === 'CAPTURED' && <StatusCaptured idea={idea} />}
      {idea.status === 'INTERVIEWING' && <StatusInterviewing idea={idea} />}
      {idea.status === 'RESEARCHING' && <StatusResearching idea={idea} />}
      {idea.status === 'COMPLETE' && (
        <StatusComplete
          idea={idea}
          onDelete={handleDelete}
          isDeleting={deleteIdea.isPending}
        />
      )}

      {/* Delete button for non-COMPLETE statuses */}
      {idea.status !== 'COMPLETE' && (
        <div className="pt-4 border-t border-[var(--border)]">
          <button
            onClick={handleDelete}
            disabled={deleteIdea.isPending}
            className="px-4 py-2 text-sm rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            {deleteIdea.isPending ? 'Deleting...' : 'Delete Idea'}
          </button>
        </div>
      )}
    </div>
  );
}

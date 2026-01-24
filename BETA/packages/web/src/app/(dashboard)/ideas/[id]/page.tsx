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
import { SparkResults } from './components/spark-results';
import { SparkProgress } from './components/spark-progress';
import type { SparkResult } from '@forge/shared';

// Check if research is a Spark validation (has sparkStatus or sparkResult)
function isSparkResearch(research: unknown): boolean {
  if (!research || typeof research !== 'object') return false;
  const r = research as Record<string, unknown>;
  return r.sparkStatus !== null && r.sparkStatus !== undefined;
}

// Check if Spark is still in progress
function isSparkInProgress(research: unknown): boolean {
  if (!research || typeof research !== 'object') return false;
  const r = research as Record<string, unknown>;
  return (
    r.sparkStatus === 'QUEUED' ||
    r.sparkStatus === 'RUNNING_KEYWORDS' ||
    r.sparkStatus === 'RUNNING_RESEARCH'
  );
}

// Check if Spark completed successfully
function isSparkComplete(research: unknown): boolean {
  if (!research || typeof research !== 'object') return false;
  const r = research as Record<string, unknown>;
  return r.sparkStatus === 'COMPLETE' && r.sparkResult !== null;
}

export default function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: idea, isLoading, error, refetch } = trpc.idea.get.useQuery({ id });

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

  const handleSparkComplete = () => {
    // Refetch the idea to get the latest data with sparkResult
    refetch();
    utils.idea.get.invalidate({ id });
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

  // Determine if this is a Spark mode idea
  const sparkMode = isSparkResearch(idea.research);
  const sparkComplete = sparkMode && isSparkComplete(idea.research);

  return (
    <div className="w-full space-y-6 max-w-[1120px] mx-auto px-6 py-8">
      {/* Header */}
      <IdeaHeader idea={idea} />

      {/* Status-specific content */}
      {idea.status === 'CAPTURED' && <StatusCaptured idea={idea} />}
      {idea.status === 'INTERVIEWING' && <StatusInterviewing idea={idea} />}

      {/* Spark researching - show progress component (handles all spark states) */}
      {idea.status === 'RESEARCHING' && sparkMode && idea.research && (
        <SparkProgress
          jobId={(idea.research as { id: string }).id}
          onComplete={handleSparkComplete}
        />
      )}

      {/* Regular research in progress */}
      {idea.status === 'RESEARCHING' && !sparkMode && (
        <StatusResearching idea={idea} />
      )}

      {/* Spark complete - show Spark results */}
      {idea.status === 'COMPLETE' && sparkComplete && idea.research && (
        <>
          <SparkResults
            result={(idea.research as unknown as { sparkResult: SparkResult }).sparkResult}
            ideaTitle={idea.title}
          />
          {/* Delete button */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={handleDelete}
              disabled={deleteIdea.isPending}
              className="px-4 py-2 text-sm rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {deleteIdea.isPending ? 'Deleting...' : 'Delete Idea'}
            </button>
          </div>
        </>
      )}

      {/* Regular complete - show full results */}
      {idea.status === 'COMPLETE' && !sparkMode && (
        <StatusComplete
          idea={idea}
          onDelete={handleDelete}
          isDeleting={deleteIdea.isPending}
        />
      )}

      {/* Delete button for non-COMPLETE statuses (excluding Spark researching) */}
      {idea.status !== 'COMPLETE' && !(idea.status === 'RESEARCHING' && sparkMode) && (
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

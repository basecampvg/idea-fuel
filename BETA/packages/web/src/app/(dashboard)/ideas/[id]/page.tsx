'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { StatusCaptured } from './components/status-captured';
import { StatusInterviewing } from './components/status-interviewing';
import { StatusResearching } from './components/status-researching';
import { SparkResults } from './components/spark-results';
import { SparkProgress } from './components/spark-progress';
import { NextStepPromotion } from './components/next-step-promotion';
import { UserStory, type UserStoryData } from './components/user-story';
import { ScoreCards } from './components/score-cards';
import { DownloadsSection } from './components/download-card';
import { Trash2 } from 'lucide-react';
import type { SparkResult, InterviewMode } from '@forge/shared';
import { getResearchJourneyState } from '@forge/shared';

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

export default function IdeaOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  // React Query deduplicates — layout already fetched this, returns cached data instantly
  const { data: idea, refetch } = trpc.idea.get.useQuery({ id: params.id });

  const deleteIdea = trpc.idea.delete.useMutation({
    onSuccess: () => {
      router.push('/ideas');
    },
  });

  const startInterview = trpc.idea.startInterview.useMutation({
    onSuccess: () => {
      router.push(`/ideas/${params.id}/interview`);
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this idea? This cannot be undone.')) {
      deleteIdea.mutate({ id: params.id });
    }
  };

  const handleStartMode = (mode: InterviewMode) => {
    startInterview.mutate({ ideaId: params.id, mode });
  };

  const handleSparkComplete = () => {
    refetch();
    utils.idea.get.invalidate({ id: params.id });
  };

  // Layout handles loading/error — if we get here, idea exists
  if (!idea) return null;

  const research = idea.research;

  // Determine if this is a Spark mode idea
  const sparkMode = isSparkResearch(idea.research);
  const sparkComplete = sparkMode && isSparkComplete(idea.research);

  // Compute journey state for next step promotion
  const activeInterview = idea.interviews?.find((i: { status: string }) => i.status === 'IN_PROGRESS');
  const completedInterview = idea.interviews?.find((i: { status: string }) => i.status === 'COMPLETE');
  const journeyState = getResearchJourneyState({
    idea: { status: idea.status },
    interview: completedInterview || activeInterview || null,
    research: idea.research ? {
      sparkStatus: (idea.research as { sparkStatus?: string }).sparkStatus as import('@forge/shared').SparkJobStatus | null,
      sparkResult: (idea.research as { sparkResult?: unknown }).sparkResult,
      status: (idea.research as { status: string }).status as import('@forge/shared').ResearchStatus,
    } : null,
  });

  return (
    <>
      {/* Status-specific content */}
      {idea.status === 'CAPTURED' && <StatusCaptured idea={idea} />}
      {idea.status === 'INTERVIEWING' && <StatusInterviewing idea={idea} />}

      {/* Spark researching - show progress component */}
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

      {/* Spark complete - show Spark results with upgrade banner */}
      {idea.status === 'COMPLETE' && sparkComplete && idea.research && (
        <>
          <NextStepPromotion
            ideaId={idea.id}
            journeyState={journeyState}
            onStartMode={handleStartMode}
            isStarting={startInterview.isPending}
          />
          <SparkResults
            result={(idea.research as unknown as { sparkResult: SparkResult }).sparkResult}
            ideaTitle={idea.title}
          />
        </>
      )}

      {/* Regular complete — Overview shows summary content via sub-pages, but main page shows key items */}
      {idea.status === 'COMPLETE' && !sparkMode && (
        <div className="space-y-5">
          <UserStory userStory={research?.userStory as UserStoryData | null | undefined} />
          <DownloadsSection ideaId={idea.id} hasResearch={research?.status === 'COMPLETE'} />
          <ScoreCards
            opportunityScore={research?.opportunityScore}
            problemScore={research?.problemScore}
            feasibilityScore={research?.feasibilityScore}
            whyNowScore={research?.whyNowScore}
            scoreJustifications={research?.scoreJustifications as any}
            scoreMetadata={research?.scoreMetadata as any}
            layout="horizontal"
          />
        </div>
      )}

      {/* Delete button */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleDelete}
          disabled={deleteIdea.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {deleteIdea.isPending ? 'Deleting...' : 'Delete Idea'}
        </button>
      </div>
    </>
  );
}

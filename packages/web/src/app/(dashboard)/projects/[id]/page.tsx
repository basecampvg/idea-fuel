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

import { AgentInsightsSection } from '@/components/agent/agent-insights-section';
import { ExpandScorecard } from './components/expand-scorecard';
import { Trash2 } from 'lucide-react';
import type { SparkResult, InterviewMode, ResearchEngine, ScoredOpportunity, MoatAuditResult, OpportunityEngineResult } from '@forge/shared';
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
  const runningStatuses = ['QUEUED', 'RUNNING_KEYWORDS', 'RUNNING_RESEARCH', 'RUNNING_PARALLEL', 'SYNTHESIZING', 'ENRICHING'];
  return runningStatuses.includes(r.sparkStatus as string);
}

// Check if Spark completed successfully
function isSparkComplete(research: unknown): boolean {
  if (!research || typeof research !== 'object') return false;
  const r = research as Record<string, unknown>;
  return (r.sparkStatus === 'COMPLETE' || r.sparkStatus === 'PARTIAL_COMPLETE') && r.sparkResult !== null;
}

export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  // React Query deduplicates — layout already fetched this, returns cached data instantly
  const { data: project, refetch } = trpc.project.get.useQuery({ id: params.id });

  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => {
      router.push('/projects');
    },
  });

  const startInterview = trpc.project.startInterview.useMutation({
    onSuccess: () => {
      router.push(`/projects/${params.id}/interview`);
    },
  });

  const generateBusinessCase = trpc.report.generateBusinessCase.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      deleteProject.mutate({ id: params.id });
    }
  };

  // Carry forward the engine choice from the most recent interview
  const latestEngine = (project?.interviews?.[0] as { researchEngine?: string } | undefined)?.researchEngine as ResearchEngine | undefined;

  const handleStartMode = (mode: InterviewMode) => {
    startInterview.mutate({ projectId: params.id, mode, researchEngine: latestEngine || 'OPENAI' });
  };

  const handleSparkComplete = () => {
    refetch();
    utils.project.get.invalidate({ id: params.id });
  };

  // Layout handles loading/error — if we get here, project exists
  if (!project) return null;

  const research = project.research;

  // Determine if this is a Spark mode project
  const sparkMode = isSparkResearch(project.research);
  const sparkComplete = sparkMode && isSparkComplete(project.research);

  // Compute journey state for next step promotion
  const activeInterview = project.interviews?.find((i: { status: string }) => i.status === 'IN_PROGRESS');
  const completedInterview = project.interviews?.find((i: { status: string }) => i.status === 'COMPLETE');
  const journeyState = getResearchJourneyState({
    project: { status: project.status },
    interview: completedInterview || activeInterview || null,
    research: project.research ? {
      sparkStatus: (project.research as { sparkStatus?: string }).sparkStatus as import('@forge/shared').SparkJobStatus | null,
      sparkResult: (project.research as { sparkResult?: unknown }).sparkResult,
      status: (project.research as { status: string }).status as import('@forge/shared').ResearchStatus,
    } : null,
  });

  return (
    <>
      {/* Status-specific content */}
      {project.status === 'CAPTURED' && project.research && (project.research as { status: string }).status === 'FAILED'
        ? <StatusResearching project={project} />
        : project.status === 'CAPTURED' && <StatusCaptured project={project} />
      }
      {project.status === 'INTERVIEWING' && <StatusInterviewing project={project} />}

      {/* Spark researching - show progress component */}
      {project.status === 'RESEARCHING' && sparkMode && project.research && (
        <SparkProgress
          jobId={(project.research as { id: string }).id}
          onComplete={handleSparkComplete}
        />
      )}

      {/* Regular research in progress */}
      {project.status === 'RESEARCHING' && !sparkMode && (
        <StatusResearching project={project} />
      )}

      {/* Spark complete - show Spark results with upgrade banner */}
      {project.status === 'COMPLETE' && sparkComplete && project.research && (
        <>
          <NextStepPromotion
            projectId={project.id}
            journeyState={journeyState}
            onStartMode={handleStartMode}
            isStarting={startInterview.isPending}
          />
          <SparkResults
            result={(project.research as unknown as { sparkResult: SparkResult }).sparkResult}
            ideaTitle={project.title}
          />
        </>
      )}

      {/* Regular complete (Launch mode) */}
      {project.status === 'COMPLETE' && !sparkMode && project.mode !== 'EXPAND' && (
        <div className="space-y-5">
          <UserStory userStory={research?.userStory as UserStoryData | null | undefined} />
          <ScoreCards
            opportunityScore={research?.opportunityScore}
            problemScore={research?.problemScore}
            feasibilityScore={research?.feasibilityScore}
            whyNowScore={research?.whyNowScore}
            scoreJustifications={research?.scoreJustifications as any}
            scoreMetadata={research?.scoreMetadata as any}
          />
        </div>
      )}

      {/* Expand Mode complete — Opportunity Scorecard */}
      {project.status === 'COMPLETE' && project.mode === 'EXPAND' && research && (
        <ExpandScorecard
          opportunities={(research.expandOpportunityEngine as unknown as OpportunityEngineResult)?.opportunities || []}
          moatAudit={research.expandMoatAudit as unknown as MoatAuditResult | null}
          onSelectOpportunity={(opportunityId) => {
            generateBusinessCase.mutate({ projectId: project.id, opportunityId });
          }}
        />
      )}

      {/* Agent Insights — shown for any complete project */}
      {project.status === 'COMPLETE' && <AgentInsightsSection />}

      {/* Delete button */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleDelete}
          disabled={deleteProject.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {deleteProject.isPending ? 'Deleting...' : 'Delete Project'}
        </button>
      </div>
    </>
  );
}

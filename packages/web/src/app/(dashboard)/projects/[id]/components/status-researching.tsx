'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  FlaskConical,
  Check,
  Search,
  MessageSquare,
  Sparkles,
  FileOutput,
  Clock,
  RotateCcw,
  AlertCircle,
  PlayCircle,
} from 'lucide-react';
import {
  RESEARCH_PHASE_LABELS,
  RESEARCH_PHASE_DESCRIPTIONS,
} from '@forge/shared';

interface Research {
  id: string;
  status: string;
  currentPhase: string;
  progress: number;
  startedAt: Date | null;
  errorMessage?: string | null;
  errorPhase?: string | null;
  // Fields to detect resume capability
  rawDeepResearch?: unknown | null;
  socialProof?: unknown | null;
  opportunityScore?: number | null;
}

interface StatusResearchingProps {
  project: {
    id: string;
    title: string;
    research?: Research | null;
  };
}

// New 4-phase pipeline phases (QUEUED removed - research starts directly at DEEP_RESEARCH)
const researchPhases = [
  'DEEP_RESEARCH',
  'SOCIAL_RESEARCH',
  'SYNTHESIS',
  'REPORT_GENERATION',
  'COMPLETE',
];

// Phase config with icons and labels
const phaseConfig: Record<string, { icon: typeof Clock; label: string }> = {
  DEEP_RESEARCH: { icon: Search, label: 'Market Research' },
  SOCIAL_RESEARCH: { icon: MessageSquare, label: 'Social Proof' },
  SYNTHESIS: { icon: Sparkles, label: 'Analyzing Data' },
  REPORT_GENERATION: { icon: FileOutput, label: 'Generating Reports' },
};

// Sub-tasks per display phase — maps to actual pipeline steps
const phaseSubTasks: Record<string, string[]> = {
  DEEP_RESEARCH: [
    'Analyzing market size & trends',
    'Researching competitors',
    'Gathering customer pain points',
    'Evaluating timing factors',
    'Sizing market opportunity',
  ],
  SYNTHESIS: [
    'Extracting market & competitor insights',
    'Extracting pain points & timing signals',
    'Calculating opportunity scores',
    'Evaluating business metrics',
    'Sizing market opportunity',
  ],
  REPORT_GENERATION: [
    'Crafting user story & value ladder',
    'Building action plan & tech stack',
    'Analyzing keyword trends',
  ],
};

// Get active subtask based on real backend phase + progress
// DEEP_RESEARCH: 5 parallel chunks, each adds ~6% progress (total 0-30%)
function getActiveSubTask(phase: string, progress: number): number {
  switch (phase) {
    case 'DEEP_RESEARCH':
      if (progress < 8) return 0;
      if (progress < 14) return 1;
      if (progress < 20) return 2;
      if (progress < 26) return 3;
      return 4;
    case 'SYNTHESIS':
      if (progress < 61) return 0;
      if (progress < 65) return 1;
      if (progress < 70) return 2;
      if (progress < 76) return 3;
      return 4;
    case 'REPORT_GENERATION':
      if (progress < 88) return 0;
      if (progress < 94) return 1;
      return 2;
    default:
      return 0;
  }
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Not started';
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
}

function estimateTimeRemaining(progress: number): string {
  const totalMinutes = 18; // ~10-15 min deep research (parallel) + ~5 min remaining phases
  const remainingMinutes = Math.round((1 - progress / 100) * totalMinutes);
  if (remainingMinutes <= 1) return '~1 minute';
  return `~${remainingMinutes} minutes`;
}

export function StatusResearching({ project }: StatusResearchingProps) {
  const utils = trpc.useUtils();
  const research = project.research;
  const [activeSubTask, setActiveSubTask] = useState(0);

  const resetResearch = trpc.research.reset.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate({ id: project.id });
    },
  });

  const restartResearch = trpc.research.start.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate({ id: project.id });
    },
  });

  // Poll queue position when research is waiting to start
  const isQueued = research?.status === 'PENDING' || (research?.status === 'IN_PROGRESS' && research?.progress === 0);
  const { data: progressData } = trpc.research.getProgress.useQuery(
    { id: research?.id ?? '' },
    {
      enabled: Boolean(research?.id && isQueued),
      refetchInterval: isQueued ? 5000 : false,
    }
  );
  const queuePosition = progressData?.queuePosition ?? null;

  // Polling is handled by project-layout-client.tsx (refetchInterval: 3000)
  // No duplicate polling needed here.

  // Calculate active subtask from real backend phase + progress
  useEffect(() => {
    if (!research) return;
    setActiveSubTask(getActiveSubTask(research.currentPhase, research.progress));
  }, [research?.currentPhase, research?.progress]);

  // When research completes, invalidate the query
  useEffect(() => {
    if (research?.status === 'COMPLETE') {
      utils.project.get.invalidate({ id: project.id });
    }
  }, [research?.status, project.id, utils.project.get]);

  if (!research) return null;

  const currentPhaseIndex = (() => {
    const idx = researchPhases.indexOf(research.currentPhase);
    return idx >= 0 ? idx : 0;
  })();
  const isFailed = research.status === 'FAILED';

  return (
    <div className="space-y-6">
      {/* Research Failed Card */}
      {isFailed && (() => {
        const canResume = Boolean(research.rawDeepResearch);
        const hasPhase2 = Boolean(research.socialProof);
        const hasPhase3 = research.opportunityScore != null;

        let resumeFromPhase = 'Market Research';
        if (canResume && !hasPhase2) resumeFromPhase = 'Social Proof';
        else if (hasPhase2 && !hasPhase3) resumeFromPhase = 'Analysis';
        else if (hasPhase3) resumeFromPhase = 'Report Generation';

        return (
        <div className="rounded-2xl bg-background border border-red-500/30 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Research Stopped</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {research.errorMessage || 'Research was interrupted'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {research.errorPhase && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Stopped at:</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                  {phaseConfig[research.errorPhase]?.label || research.errorPhase}
                </span>
              </div>
            )}

            {canResume && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary">
                  <span className="font-medium">Good news!</span> Previous progress saved. Will resume from {resumeFromPhase}.
                </p>
              </div>
            )}

            <button
              onClick={() => restartResearch.mutate({ projectId: project.id })}
              disabled={restartResearch.isPending}
              className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl font-medium text-white bg-gradient-to-r from-primary to-primary/70 hover:from-primary/90 hover:to-primary/60 transition-all disabled:opacity-50"
            >
              <PlayCircle className={`w-5 h-5 ${restartResearch.isPending ? 'animate-spin' : ''}`} />
              {restartResearch.isPending ? 'Starting...' : canResume ? 'Resume Research' : 'Restart Research'}
            </button>
          </div>
        </div>
        );
      })()}

      {/* Research Progress Card - Only show when IN_PROGRESS */}
      {!isFailed && (
      <div className="rounded-2xl bg-background border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-primary/70" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {isQueued && queuePosition ? 'Research Queued' : 'Research in Progress'}
          </h2>
        </div>

        {/* Queue Position Banner */}
        {isQueued && queuePosition && queuePosition > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-primary/70" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Position {queuePosition} in queue
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {queuePosition === 1
                  ? 'Your research will start next'
                  : `${queuePosition - 1} research ${queuePosition - 1 === 1 ? 'job' : 'jobs'} ahead of yours`}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* Current Phase */}
          <div>
            <p className="text-sm font-medium text-foreground">
              {isQueued && queuePosition ? 'Waiting to start...' : (RESEARCH_PHASE_LABELS[research.currentPhase] || research.currentPhase)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isQueued && queuePosition ? 'Your research is in the queue and will begin automatically' : (RESEARCH_PHASE_DESCRIPTIONS[research.currentPhase] || '')}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 shadow-[0_0_10px_hsla(10,80%,55%,0.5)]"
                style={{ width: `${research.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{research.progress}% complete</span>
              <span>Est. {estimateTimeRemaining(research.progress)} remaining</span>
            </div>
          </div>

          {/* Subtasks List */}
          <div className="space-y-2">
            {researchPhases.slice(0, -1).map((phase, index) => {
              const isComplete = index < currentPhaseIndex;
              const isCurrent = index === currentPhaseIndex;
              const config = phaseConfig[phase];
              const Icon = config?.icon || Clock;

              const subTasks = phaseSubTasks[phase];
              const hasSubTasks = isCurrent && subTasks && subTasks.length > 0;

              return (
                <div key={phase} className="space-y-1">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-primary/10 border border-primary/30'
                        : isComplete
                        ? 'bg-primary/5 border border-transparent'
                        : 'bg-card border border-transparent opacity-50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isComplete
                          ? 'bg-primary/20'
                          : isCurrent
                          ? 'bg-primary/20'
                          : 'bg-muted'
                      }`}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4 text-primary" strokeWidth={3} />
                      ) : (
                        <Icon
                          className={`w-4 h-4 ${
                            isCurrent ? 'text-primary/70' : 'text-muted-foreground/70'
                          }`}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isComplete
                            ? 'text-primary'
                            : isCurrent
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {config?.label || phase}
                      </p>
                      {isCurrent && !hasSubTasks && (
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-primary/20">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300 animate-pulse"
                            style={{ width: '60%' }}
                          />
                        </div>
                      )}
                    </div>

                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        isComplete
                          ? 'bg-primary/20 text-primary'
                          : isCurrent
                          ? 'bg-primary/20 text-primary/70'
                          : 'text-muted-foreground/70'
                      }`}
                    >
                      {isComplete ? 'Done' : isCurrent ? 'Running' : 'Pending'}
                    </span>
                  </div>

                  {/* Sub-tasks for long-running phases */}
                  {hasSubTasks && (
                    <div className="ml-11 pl-3 border-l-2 border-primary/20 space-y-1.5 py-2">
                      {subTasks.map((subTask, subIndex) => {
                        const isSubComplete = subIndex < activeSubTask;
                        const isSubCurrent = subIndex === activeSubTask;

                        return (
                          <div
                            key={subTask}
                            className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                              isSubCurrent
                                ? 'text-primary/70'
                                : isSubComplete
                                ? 'text-muted-foreground'
                                : 'text-muted-foreground/50'
                            }`}
                          >
                            {isSubComplete ? (
                              <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                            ) : isSubCurrent ? (
                              <span className="w-3 h-3 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse" />
                              </span>
                            ) : (
                              <span className="w-3 h-3 flex items-center justify-center">
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              </span>
                            )}
                            <span className={isSubCurrent ? 'font-medium' : ''}>
                              {subTask}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time Info and Reset Button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Started: {formatTimeAgo(research.startedAt)}
            </p>
            <button
              onClick={() => {
                if (confirm('Reset stuck research? This will allow you to restart from the beginning.')) {
                  resetResearch.mutate({ projectId: project.id });
                }
              }}
              disabled={resetResearch.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-primary/30 text-primary/50 hover:bg-primary/10 transition-colors disabled:opacity-50"
              title="Reset if research appears stuck"
            >
              <RotateCcw className={`w-3 h-3 ${resetResearch.isPending ? 'animate-spin' : ''}`} />
              {resetResearch.isPending ? 'Resetting...' : 'Reset'}
            </button>
          </div>
        </div>
      </div>
      )}

    </div>
  );
}

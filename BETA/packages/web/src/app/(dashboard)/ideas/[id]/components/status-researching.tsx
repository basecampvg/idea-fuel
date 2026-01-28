'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import {
  FlaskConical,
  CheckCircle2,
  FileText,
  Lock,
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
  INTERVIEW_MODE_LABELS,
  RESEARCH_PHASE_LABELS,
  RESEARCH_PHASE_DESCRIPTIONS,
  REPORT_TYPE_LABELS,
} from '@forge/shared';

interface Interview {
  id: string;
  mode: string;
  status: string;
  confidenceScore: number;
  createdAt: Date;
}

interface Research {
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
  idea: {
    id: string;
    title: string;
    interviews?: Interview[];
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

// Sub-tasks for DEEP_RESEARCH phase - maps to actual chunked research
// Progress ranges: 5-12% market, 12-19% competitors, 19-25% painpoints, 25-30% timing
const phaseSubTasks: Record<string, string[]> = {
  DEEP_RESEARCH: [
    'Analyzing market size & trends',
    'Researching competitors',
    'Gathering customer pain points',
    'Evaluating timing factors',
  ],
};

// Get active subtask based on actual progress (not timer)
// Maps progress 0-30% to subtask indices 0-3
function getActiveSubTaskFromProgress(progress: number): number {
  if (progress < 12) return 0; // Market Analysis (5-12%)
  if (progress < 19) return 1; // Competitor Research (12-19%)
  if (progress < 25) return 2; // Customer Pain Points (19-25%)
  return 3; // Timing & Validation (25-30%)
}

// All 10 report types
const reportTypes = [
  'BUSINESS_PLAN',
  'POSITIONING',
  'COMPETITIVE_ANALYSIS',
  'WHY_NOW',
  'PROOF_SIGNALS',
  'KEYWORDS_SEO',
  'CUSTOMER_PROFILE',
  'VALUE_EQUATION',
  'VALUE_LADDER',
  'GO_TO_MARKET',
];

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
  // Chunked deep research: ~15-20 minutes for Phase 1 (0-30%)
  // Phase 2 (social proof): ~5 minutes
  // Phases 3-4 use GPT-5.2: ~3 minutes each
  // Total: ~25-30 minutes for comprehensive research
  const totalMinutes = 25;
  const remainingMinutes = Math.round((1 - progress / 100) * totalMinutes);
  if (remainingMinutes <= 1) return '~1 minute';
  return `~${remainingMinutes} minutes`;
}

export function StatusResearching({ idea }: StatusResearchingProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const completedInterview = idea.interviews?.find((i) => i.status === 'COMPLETE');
  const research = idea.research;
  const [activeSubTask, setActiveSubTask] = useState(0);

  const startInterview = trpc.idea.startInterview.useMutation({
    onSuccess: () => {
      router.push(`/ideas/${idea.id}/interview`);
    },
  });

  const resetResearch = trpc.research.reset.useMutation({
    onSuccess: () => {
      // Invalidate to refetch idea with updated status
      utils.idea.get.invalidate({ id: idea.id });
    },
  });

  const restartResearch = trpc.research.start.useMutation({
    onSuccess: () => {
      // Invalidate to refetch idea with updated research status
      utils.idea.get.invalidate({ id: idea.id });
    },
  });

  // Poll for research progress every 3 seconds while in progress
  useEffect(() => {
    if (!research || research.status !== 'IN_PROGRESS') return;

    const interval = setInterval(() => {
      utils.idea.get.invalidate({ id: idea.id });
    }, 3000);

    return () => clearInterval(interval);
  }, [research?.status, idea.id, utils.idea.get]);

  // Calculate active subtask from progress (not timer-based)
  // This shows checkmarks only when actual chunks complete
  useEffect(() => {
    if (research?.currentPhase !== 'DEEP_RESEARCH') {
      setActiveSubTask(0); // Reset when leaving phase
      return;
    }

    // Map progress to subtask index based on chunk completion
    const newActiveSubTask = getActiveSubTaskFromProgress(research.progress);
    setActiveSubTask(newActiveSubTask);
  }, [research?.currentPhase, research?.progress]);

  // When research completes, invalidate the query to update the parent page's idea status
  useEffect(() => {
    if (research?.status === 'COMPLETE') {
      // Invalidate to refetch idea with updated status
      utils.idea.get.invalidate({ id: idea.id });
    }
  }, [research?.status, idea.id, utils.idea.get]);

  if (!research) return null;

  const currentPhaseIndex = researchPhases.indexOf(research.currentPhase);
  const isFailed = research.status === 'FAILED';

  return (
    <div className="space-y-6">
      {/* Research Failed Card */}
      {isFailed && (() => {
        // Determine if we can resume (skip completed phases) or need to restart fresh
        const canResume = Boolean(research.rawDeepResearch);
        const hasPhase2 = Boolean(research.socialProof);
        const hasPhase3 = research.opportunityScore != null;

        // Determine what phase we'll resume from
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
            {/* Show where it stopped */}
            {research.errorPhase && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Stopped at:</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                  {phaseConfig[research.errorPhase]?.label || research.errorPhase}
                </span>
              </div>
            )}

            {/* Resume info - show what will be skipped */}
            {canResume && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary">
                  <span className="font-medium">Good news!</span> Previous progress saved. Will resume from {resumeFromPhase}.
                </p>
              </div>
            )}

            {/* Restart/Resume Button */}
            <button
              onClick={() => restartResearch.mutate({ ideaId: idea.id })}
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
          <h2 className="text-lg font-semibold text-foreground">Research in Progress</h2>
        </div>

        <div className="space-y-5">
          {/* Current Phase */}
          <div>
            <p className="text-sm font-medium text-foreground">
              {RESEARCH_PHASE_LABELS[research.currentPhase] || research.currentPhase}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {RESEARCH_PHASE_DESCRIPTIONS[research.currentPhase] || ''}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 shadow-[0_0_10px_hsla(160,84%,44%,0.5)]"
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
                    {/* Status Icon */}
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

                    {/* Label and Progress */}
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

                    {/* Status Badge */}
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
                  resetResearch.mutate({ ideaId: idea.id });
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

      {/* Completed Interview */}
      {completedInterview && (
        <div className="rounded-2xl bg-background border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Interview Complete</h2>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
              {INTERVIEW_MODE_LABELS[completedInterview.mode] || completedInterview.mode}
            </span>
            <span>•</span>
            <span>Confidence: {completedInterview.confidenceScore}</span>
            <span>•</span>
            <span>{new Date(completedInterview.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="flex gap-3 mt-4">
            <Link
              href={`/ideas/${idea.id}/interview`}
              className="px-4 py-2 text-sm rounded-xl bg-card hover:bg-muted border border-border text-foreground transition-colors"
            >
              View Interview
            </Link>
            <button
              onClick={() => startInterview.mutate({ ideaId: idea.id, mode: 'IN_DEPTH' })}
              disabled={startInterview.isPending}
              className="px-4 py-2 text-sm rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-50"
            >
              Start Another
            </button>
          </div>
        </div>
      )}

      {/* Locked Reports Grid */}
      <div className="rounded-2xl bg-background border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Reports</h2>
          <span className="text-sm text-muted-foreground">({reportTypes.length})</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {reportTypes.map((type) => (
            <div
              key={type}
              className="p-4 rounded-xl bg-card border border-border opacity-60 cursor-not-allowed"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2">
                  <Lock className="w-5 h-5 text-primary/50" />
                </div>
                <span className="text-xs font-medium text-muted-foreground line-clamp-2">
                  {REPORT_TYPE_LABELS[type] || type}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-5 text-center">
          Reports will be available when research completes
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
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
  Database,
  Sparkles,
  FileOutput,
  Clock,
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
}

interface StatusResearchingProps {
  idea: {
    id: string;
    title: string;
    interviews?: Interview[];
    research?: Research | null;
  };
}

const researchPhases = [
  'QUEUED',
  'QUERY_GENERATION',
  'DATA_COLLECTION',
  'SYNTHESIS',
  'REPORT_GENERATION',
  'COMPLETE',
];

// Phase config with icons and labels
const phaseConfig: Record<string, { icon: typeof Clock; label: string }> = {
  QUEUED: { icon: Clock, label: 'Queued' },
  QUERY_GENERATION: { icon: Search, label: 'Generating Queries' },
  DATA_COLLECTION: { icon: Database, label: 'Collecting Data' },
  SYNTHESIS: { icon: Sparkles, label: 'Synthesizing Insights' },
  REPORT_GENERATION: { icon: FileOutput, label: 'Generating Reports' },
};

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
  // MVP estimate: ~2-3 minutes total (4 OpenAI calls)
  const totalSeconds = 180; // 3 minutes average
  const remainingSeconds = Math.round((1 - progress / 100) * totalSeconds);
  if (remainingSeconds < 60) return `~${remainingSeconds} seconds`;
  const minutes = Math.round(remainingSeconds / 60);
  return `~${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function StatusResearching({ idea }: StatusResearchingProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const completedInterview = idea.interviews?.find((i) => i.status === 'COMPLETE');
  const research = idea.research;

  const startInterview = trpc.idea.startInterview.useMutation({
    onSuccess: () => {
      router.push(`/ideas/${idea.id}/interview`);
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

  // When research completes, invalidate the query to update the parent page's idea status
  useEffect(() => {
    if (research?.status === 'COMPLETE') {
      // Invalidate to refetch idea with updated status
      utils.idea.get.invalidate({ id: idea.id });
    }
  }, [research?.status, idea.id, utils.idea.get]);

  if (!research) return null;

  const currentPhaseIndex = researchPhases.indexOf(research.currentPhase);

  return (
    <div className="space-y-6">
      {/* Research Progress Card */}
      <div className="rounded-2xl bg-background border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Research in Progress</h2>
        </div>

        <div className="space-y-5">
          {/* Current Phase */}
          <div>
            <p className="text-base font-medium text-foreground">
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
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
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

              return (
                <div
                  key={phase}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-blue-500/10 border border-blue-500/30'
                      : isComplete
                      ? 'bg-emerald-500/5 border border-transparent'
                      : 'bg-card border border-transparent opacity-50'
                  }`}
                >
                  {/* Status Icon */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isComplete
                        ? 'bg-emerald-500/20'
                        : isCurrent
                        ? 'bg-blue-500/20'
                        : 'bg-muted'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                    ) : (
                      <Icon
                        className={`w-4 h-4 ${
                          isCurrent ? 'text-blue-400' : 'text-muted-foreground/70'
                        }`}
                      />
                    )}
                  </div>

                  {/* Label and Progress */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isComplete
                          ? 'text-emerald-400'
                          : isCurrent
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {config?.label || phase}
                    </p>
                    {isCurrent && (
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-blue-500/20">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 animate-pulse"
                          style={{ width: '60%' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isComplete
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isCurrent
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-muted-foreground/70'
                    }`}
                  >
                    {isComplete ? 'Done' : isCurrent ? 'Running' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time Info */}
          <p className="text-sm text-muted-foreground">
            Started: {formatTimeAgo(research.startedAt)}
          </p>
        </div>
      </div>

      {/* Completed Interview */}
      {completedInterview && (
        <div className="rounded-2xl bg-background border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Interview Complete</h2>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
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
          <div className="w-10 h-10 rounded-full bg-[#00d4ff]/20 flex items-center justify-center">
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
                  <Lock className="w-5 h-5 text-amber-500/60" />
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

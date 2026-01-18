'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
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

  // Redirect to idea page when research completes (will show COMPLETE status)
  useEffect(() => {
    if (research?.status === 'COMPLETE') {
      router.refresh();
    }
  }, [research?.status, router]);

  if (!research) return null;

  const currentPhaseIndex = researchPhases.indexOf(research.currentPhase);

  return (
    <div className="space-y-6">
      {/* Research Progress Card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔬</span>
          <h2 className="text-lg font-medium text-[var(--foreground)]">Research in Progress</h2>
        </div>

        <div className="space-y-4">
          {/* Current Phase */}
          <div>
            <p className="text-base font-medium text-[var(--foreground)]">
              {RESEARCH_PHASE_LABELS[research.currentPhase] || research.currentPhase}
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {RESEARCH_PHASE_DESCRIPTIONS[research.currentPhase] || ''}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--card-bg)]">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                style={{ width: `${research.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
              <span>{research.progress}% complete</span>
              <span>Est. {estimateTimeRemaining(research.progress)} remaining</span>
            </div>
          </div>

          {/* Phase Timeline */}
          <div className="flex items-center justify-between py-2">
            {researchPhases.slice(0, -1).map((phase, index) => {
              const isComplete = index < currentPhaseIndex;
              const isCurrent = index === currentPhaseIndex;

              return (
                <div key={phase} className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full flex items-center justify-center ${
                      isComplete
                        ? 'bg-emerald-500'
                        : isCurrent
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-[var(--card-bg)] border border-[var(--border)]'
                    }`}
                  >
                    {isComplete && (
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {index < researchPhases.length - 2 && (
                    <div
                      className={`w-8 sm:w-12 h-0.5 ${
                        isComplete ? 'bg-emerald-500' : 'bg-[var(--border)]'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Time Info */}
          <p className="text-sm text-[var(--muted-foreground)]">
            Started: {formatTimeAgo(research.startedAt)}
          </p>
        </div>
      </div>

      {/* Completed Interview */}
      {completedInterview && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✅</span>
            <h2 className="text-lg font-medium text-[var(--foreground)]">Interview Complete</h2>
          </div>

          <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
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
              className="px-4 py-2 text-sm rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors"
            >
              View Interview
            </Link>
            <button
              onClick={() => startInterview.mutate({ ideaId: idea.id, mode: 'IN_DEPTH' })}
              disabled={startInterview.isPending}
              className="px-4 py-2 text-sm rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)] transition-colors disabled:opacity-50"
            >
              Start Another
            </button>
          </div>
        </div>
      )}

      {/* Locked Reports Grid */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">📄</span>
          <h2 className="text-lg font-medium text-[var(--foreground)]">Reports</h2>
          <span className="text-sm text-[var(--muted-foreground)]">({reportTypes.length})</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {reportTypes.map((type) => (
            <div
              key={type}
              className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] opacity-50 cursor-not-allowed"
            >
              <div className="flex flex-col items-center text-center">
                <span className="text-2xl mb-2">🔒</span>
                <span className="text-xs font-medium text-[var(--muted-foreground)] line-clamp-2">
                  {REPORT_TYPE_LABELS[type] || type}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--muted-foreground)] mt-4 text-center">
          Reports will be available when research completes
        </p>
      </div>
    </div>
  );
}

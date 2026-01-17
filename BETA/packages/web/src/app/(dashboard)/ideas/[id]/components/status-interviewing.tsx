'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { INTERVIEW_MODE_LABELS } from '@forge/shared';

interface Interview {
  id: string;
  mode: string;
  status: string;
  currentTurn: number;
  maxTurns: number;
  confidenceScore: number;
  lastActiveAt: Date;
}

interface StatusInterviewingProps {
  idea: {
    id: string;
    title: string;
    description: string;
    interviews?: Interview[];
  };
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function StatusInterviewing({ idea }: StatusInterviewingProps) {
  const [showDescription, setShowDescription] = useState(false);
  const utils = trpc.useUtils();

  const activeInterview = idea.interviews?.find((i) => i.status === 'IN_PROGRESS');

  const abandonInterview = trpc.interview.abandon.useMutation({
    onSuccess: () => {
      utils.idea.get.invalidate({ id: idea.id });
    },
  });

  if (!activeInterview) {
    return null;
  }

  const progress = (activeInterview.currentTurn / activeInterview.maxTurns) * 100;

  return (
    <div className="space-y-6">
      {/* Interview Progress Card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">💬</span>
          <h2 className="text-lg font-medium text-[var(--foreground)]">Interview in Progress</h2>
        </div>

        <div className="space-y-4">
          {/* Mode and Turn Info */}
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400">
              {INTERVIEW_MODE_LABELS[activeInterview.mode] || activeInterview.mode}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              Turn {activeInterview.currentTurn} of {activeInterview.maxTurns}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--card-bg)]">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
              <span>{Math.round(progress)}% complete</span>
              <span>Confidence: {activeInterview.confidenceScore}</span>
            </div>
          </div>

          {/* Last Active */}
          <p className="text-sm text-[var(--muted-foreground)]">
            Last active: {formatTimeAgo(activeInterview.lastActiveAt)}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <Link
              href={`/ideas/${idea.id}/interview`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent)]/20 active:scale-[0.98]"
            >
              Continue Interview
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Abandon Link */}
          <button
            onClick={() => {
              if (confirm('Are you sure you want to abandon this interview? You can start a new one later.')) {
                abandonInterview.mutate({ id: activeInterview.id });
              }
            }}
            disabled={abandonInterview.isPending}
            className="text-sm text-[var(--muted-foreground)] hover:text-red-400 transition-colors disabled:opacity-50"
          >
            Abandon interview
          </button>
        </div>
      </div>

      {/* Collapsible Description */}
      <div className="glass-card p-6">
        <button
          onClick={() => setShowDescription(!showDescription)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-lg font-medium text-[var(--foreground)]">Your Idea</h2>
          <svg
            className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${showDescription ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDescription ? (
          <p className="mt-4 text-[var(--foreground)]/80 whitespace-pre-wrap leading-relaxed">
            {idea.description}
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted-foreground)] truncate">
            {idea.description.slice(0, 100)}...
          </p>
        )}
      </div>

      {/* Coming Next */}
      <div className="glass-card p-6 opacity-60">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🔒</span>
          <h2 className="text-lg font-medium text-[var(--foreground)]">Coming Next</h2>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Research & Reports unlock after you complete the interview
        </p>
      </div>
    </div>
  );
}

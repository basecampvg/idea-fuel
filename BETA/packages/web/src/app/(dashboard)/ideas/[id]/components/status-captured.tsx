'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { INTERVIEW_MODE_LABELS, INTERVIEW_MODE_DESCRIPTIONS } from '@forge/shared';

interface StatusCapturedProps {
  idea: {
    id: string;
    title: string;
    description: string;
  };
}

export function StatusCaptured({ idea }: StatusCapturedProps) {
  const router = useRouter();

  const startInterview = trpc.idea.startInterview.useMutation({
    onSuccess: () => {
      router.push(`/ideas/${idea.id}/interview`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Description Card */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-medium text-[var(--foreground)] mb-3">Your Idea</h2>
        <p className="text-[var(--foreground)]/80 whitespace-pre-wrap leading-relaxed">
          {idea.description}
        </p>
      </div>

      {/* Interview Options */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-[var(--foreground)]">Ready to Discover?</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Start an interview to develop your idea with AI-powered guidance
          </p>
        </div>

        {/* In-Depth Interview (Recommended) */}
        <button
          onClick={() => startInterview.mutate({ ideaId: idea.id, mode: 'IN_DEPTH' })}
          disabled={startInterview.isPending}
          className="w-full glass-card p-6 text-left transition-all duration-300 hover:border-[var(--accent)]/30 hover:shadow-lg hover:shadow-[var(--accent)]/5 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔬</span>
                <h3 className="text-base font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                  {INTERVIEW_MODE_LABELS.IN_DEPTH}
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
                  Recommended
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {INTERVIEW_MODE_DESCRIPTIONS.IN_DEPTH}
              </p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]/70">
                15+ questions • Most comprehensive insights
              </p>
            </div>
            <svg
              className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Light Interview */}
        <button
          onClick={() => startInterview.mutate({ ideaId: idea.id, mode: 'LIGHT' })}
          disabled={startInterview.isPending}
          className="w-full glass-card p-6 text-left transition-all duration-300 hover:border-[var(--accent)]/30 hover:shadow-lg hover:shadow-[var(--accent)]/5 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h3 className="text-base font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                  {INTERVIEW_MODE_LABELS.LIGHT}
                </h3>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {INTERVIEW_MODE_DESCRIPTIONS.LIGHT}
              </p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]/70">
                5 questions • Quick discovery
              </p>
            </div>
            <svg
              className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}

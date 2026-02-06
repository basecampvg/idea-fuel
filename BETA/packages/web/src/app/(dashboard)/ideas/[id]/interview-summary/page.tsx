'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIdea } from '../components/use-idea-section';
import { trpc } from '@/lib/trpc/client';
import { SectionEmptyState } from '../components/section-empty-state';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { INTERVIEW_MODE_LABELS } from '@forge/shared';

export default function InterviewSummaryPage() {
  const { idea } = useIdea();
  const router = useRouter();

  const startInterview = trpc.idea.startInterview.useMutation({
    onSuccess: () => {
      if (idea) router.push(`/ideas/${idea.id}/interview`);
    },
  });

  if (!idea) return null;

  const completedInterview = idea.interviews?.find(
    (i: { status: string }) => i.status === 'COMPLETE'
  );

  if (!completedInterview) {
    return <SectionEmptyState section="Interview Summary" />;
  }

  return (
    <div className="rounded-2xl bg-background border border-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-[#22c55e]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Interview Summary</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] text-xs font-medium">
              {INTERVIEW_MODE_LABELS[completedInterview.mode] || completedInterview.mode}
            </span>
            <span>·</span>
            <span>Confidence: {completedInterview.confidenceScore}</span>
            <span>·</span>
            <span>{new Date(completedInterview.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-4 mt-4 pt-4 border-t border-border">
        <Link
          href={`/ideas/${idea.id}/interview`}
          className="flex items-center gap-1 text-sm text-accent hover:opacity-80 transition-opacity"
        >
          <span>View Full Interview</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
        <button
          onClick={() => startInterview.mutate({ ideaId: idea.id, mode: 'IN_DEPTH' })}
          disabled={startInterview.isPending}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Start Another
        </button>
      </div>
    </div>
  );
}

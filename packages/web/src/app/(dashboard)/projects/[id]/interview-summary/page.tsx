'use client';

import { useRouter } from 'next/navigation';
import { useProject } from '../components/use-project-section';
import { trpc } from '@/lib/trpc/client';
import { SectionEmptyState } from '../components/section-empty-state';
import {
  MessageSquare,
  Bot,
  User,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { INTERVIEW_MODE_LABELS } from '@forge/shared';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

/** Parse bold **text** markers into styled spans */
function renderMarkdown(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-foreground font-semibold">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** Format ISO timestamp to readable time */
function formatTime(timestamp?: string) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  const paragraphs = message.content.split('\n').filter((l) => l.trim());

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">IdeaFuel</span>
        {message.timestamp && (
          <span className="text-[11px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
      <div className="ml-8">
        <div className="text-sm text-foreground/90 leading-relaxed space-y-2">
          {paragraphs.map((p, i) => (
            <p key={i}>{renderMarkdown(p)}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  const paragraphs = message.content.split('\n').filter((l) => l.trim());

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">You</span>
        {message.timestamp && (
          <span className="text-[11px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
      <div className="ml-8">
        <div className="rounded-xl bg-primary/8 border border-primary/10 px-4 py-2.5 inline-block">
          <div className="text-sm text-foreground leading-relaxed space-y-2">
            {paragraphs.map((p, i) => (
              <p key={i}>{renderMarkdown(p)}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewSummaryPage() {
  const { project } = useProject();
  const router = useRouter();

  const completedInterview = project?.interviews?.find(
    (i: { status: string }) => i.status === 'COMPLETE'
  );

  // Fetch the full interview with messages
  const { data: fullInterview, isLoading: interviewLoading } =
    trpc.interview.get.useQuery(
      { id: completedInterview?.id ?? '' },
      { enabled: !!completedInterview?.id }
    );

  const startInterview = trpc.project.startInterview.useMutation({
    onSuccess: () => {
      if (project) router.push(`/projects/${project.id}/interview`);
    },
  });

  if (!project) return null;

  if (!completedInterview) {
    return <SectionEmptyState section="Interview Summary" />;
  }

  const messages: ChatMessage[] = fullInterview?.messages
    ? (fullInterview.messages as unknown as ChatMessage[])
    : [];

  // Filter out system messages
  const visibleMessages = messages.filter((m) => m.role !== 'system');

  // Count collected data points
  const collectedData = fullInterview?.collectedData as Record<string, unknown> | null;
  const filledFields = collectedData
    ? Object.values(collectedData).filter((v) => v !== null && v !== undefined).length
    : 0;

  const confidencePercent = completedInterview.confidenceScore ?? 0;

  return (
    <div className="space-y-4">
      {/* Header — compact inline bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground">Interview Complete</h2>
              <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium leading-none">
                {INTERVIEW_MODE_LABELS[completedInterview.mode] || completedInterview.mode}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>{new Date(completedInterview.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="text-border">·</span>
              <span>{completedInterview.currentTurn}/{completedInterview.maxTurns} turns</span>
              <span className="text-border">·</span>
              <span>Confidence {confidencePercent}</span>
              <span className="text-border">·</span>
              <span>{filledFields} data points</span>
            </div>
          </div>
        </div>
        <button
          onClick={() =>
            startInterview.mutate({
              projectId: project.id,
              mode: 'IN_DEPTH',
              researchEngine: ((completedInterview as { researchEngine?: string }).researchEngine || 'OPENAI') as 'OPENAI' | 'PERPLEXITY',
            })
          }
          disabled={startInterview.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          Redo
        </button>
      </div>

      {/* Conversation Thread */}
      <div className="rounded-xl bg-background border border-border overflow-hidden">
        {interviewLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            <span className="text-sm text-muted-foreground">Loading conversation...</span>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No conversation messages found.
          </div>
        ) : (
          <div className="px-5 py-5 space-y-5">
            {visibleMessages.map((msg, i) => {
              const showDivider = msg.role === 'assistant' && i > 0;
              return (
                <div key={msg.id ?? i}>
                  {showDivider && <div className="border-t border-border/50 mb-5" />}
                  {msg.role === 'assistant' ? (
                    <AssistantBubble message={msg} />
                  ) : (
                    <UserBubble message={msg} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

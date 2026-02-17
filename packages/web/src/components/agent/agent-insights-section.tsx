'use client';

import { useCallback } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Bot, Trash2, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

export function AgentInsightsSection() {
  const params = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data: insights, isLoading } = trpc.agent.listInsights.useQuery(
    { projectId: params.id },
    { enabled: !!params.id }
  );

  const deleteInsight = trpc.agent.deleteInsight.useMutation({
    onSuccess() {
      utils.agent.listInsights.invalidate({ projectId: params.id });
    },
  });

  const reorderInsights = trpc.agent.reorderInsights.useMutation({
    onSuccess() {
      utils.agent.listInsights.invalidate({ projectId: params.id });
    },
  });

  const handleDelete = useCallback(
    (insightId: string) => {
      if (confirm('Remove this insight?')) {
        deleteInsight.mutate({ insightId });
      }
    },
    [deleteInsight]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (!insights || index <= 0) return;
      const ids = insights.map((i) => i.id);
      [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
      reorderInsights.mutate({ insightIds: ids });
    },
    [insights, reorderInsights]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (!insights || index >= insights.length - 1) return;
      const ids = insights.map((i) => i.id);
      [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
      reorderInsights.mutate({ insightIds: ids });
    },
    [insights, reorderInsights]
  );

  // Don't render anything if there are no insights (or still loading)
  if (isLoading || !insights || insights.length === 0) return null;

  return (
    <div className="rounded-2xl bg-background border border-border p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">AI Agent Insights</h2>
          <p className="text-xs text-muted-foreground">
            Generated from your conversations with the AI agent
          </p>
        </div>
      </div>

      {/* Insight cards */}
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={insight.id}
            className="rounded-xl border border-border bg-muted/30 p-4 group"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="w-4 h-4 text-primary flex-shrink-0" />
                <h3 className="text-sm font-medium text-foreground truncate">
                  {insight.title}
                </h3>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || reorderInsights.isPending}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === insights.length - 1 || reorderInsights.isPending}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(insight.id)}
                  disabled={deleteInsight.isPending}
                  className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Remove insight"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
              <ReactMarkdown>{insight.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

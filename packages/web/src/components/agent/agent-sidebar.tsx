'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useChat } from 'ai/react';
import { X, Bot, RotateCcw } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useAgentSidebar, AGENT_SIDEBAR_WIDTH } from './agent-sidebar-context';
import { AgentMessage, AgentTypingIndicator } from './agent-message';
import { AgentInput } from './agent-input';
import { AgentInsightPreview } from './agent-insight-preview';
import { AgentUpgradePrompt } from './agent-upgrade-prompt';
import { TOP_BAR_HEIGHT } from '@/components/layout/sidebar-context';

export function AgentSidebar() {
  const { isOpen, close, projectId } = useAgentSidebar();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingInsight, setPendingInsight] = useState<{
    title: string;
    content: string;
    reportId?: string;
  } | null>(null);

  // Check subscription tier
  const { data: user } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const isPro = user?.subscription !== 'FREE';

  // Load existing conversation
  const { data: conversation } = trpc.agent.getConversation.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId && isPro }
  );

  // AI SDK chat hook — v6 pattern (input state managed externally)
  const {
    messages,
    isLoading,
    stop,
    append,
    setMessages,
  } = useChat({
    api: '/api/agent/chat',
    body: { projectId },
    initialMessages: conversation?.messages
      ? (conversation.messages as Array<{ id: string; role: 'user' | 'assistant'; content: string }>).map(
          (m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })
        )
      : [],
    onFinish(message) {
      // Check if the assistant response contains an insight preview
      // (This is a simplified check — in production, parse tool results)
      if (message.content.includes('CONFIRM_INSIGHT')) {
        try {
          const match = message.content.match(/\{[^}]*"action"\s*:\s*"CONFIRM_INSIGHT"[^}]*\}/);
          if (match) {
            const insight = JSON.parse(match[0]);
            setPendingInsight({
              title: insight.title,
              content: insight.content,
              reportId: insight.reportId,
            });
          }
        } catch {
          // Not a valid insight preview, ignore
        }
      }
    },
  });

  // Confirm insight mutation
  const utils = trpc.useUtils();
  const confirmInsight = trpc.agent.confirmInsight.useMutation({
    onSuccess() {
      setPendingInsight(null);
      utils.agent.listInsights.invalidate();
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Reset messages when conversation data loads
  useEffect(() => {
    if (conversation?.messages) {
      const msgs = (conversation.messages as Array<{ id: string; role: string; content: string }>).map(
        (m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })
      );
      setMessages(msgs);
    }
  }, [conversation?.id]); // Only when conversation ID changes

  const handleSend = useCallback(
    (text: string) => {
      if (!projectId) return;
      append({
        role: 'user',
        content: text,
      });
    },
    [projectId, append]
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const handleConfirmInsight = useCallback(() => {
    if (!pendingInsight || !projectId || !conversation?.id) return;
    confirmInsight.mutate({
      projectId,
      conversationId: conversation.id,
      title: pendingInsight.title,
      content: pendingInsight.content,
      prompt: messages[messages.length - 2]?.content || '', // User's prompt
      reportId: pendingInsight.reportId,
    });
  }, [pendingInsight, projectId, conversation?.id, confirmInsight, messages]);

  if (!isOpen) return null;

  return (
    <aside
      role="complementary"
      aria-label="AI Agent"
      className="fixed right-0 bottom-0 z-50 flex flex-col bg-background border-l border-border
        transition-transform duration-200 ease-out motion-reduce:duration-0"
      style={{
        width: AGENT_SIDEBAR_WIDTH,
        top: TOP_BAR_HEIGHT,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Forge AI</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={close}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Close (Ctrl+J)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      {!isPro ? (
        <AgentUpgradePrompt />
      ) : !projectId ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-sm text-muted-foreground">
            Open a project to start chatting with the AI agent.
          </p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Bot className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Ask me anything about your project
                </p>
                <p className="text-xs text-muted-foreground max-w-[250px]">
                  I can search your research data, reports, interviews, and notes
                  to answer questions and generate insights.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <AgentMessage
                key={message.id}
                role={message.role as 'user' | 'assistant'}
                content={message.content}
              />
            ))}

            {isLoading && <AgentTypingIndicator />}

            {/* Insight preview card */}
            {pendingInsight && (
              <AgentInsightPreview
                title={pendingInsight.title}
                content={pendingInsight.content}
                reportId={pendingInsight.reportId}
                onConfirm={handleConfirmInsight}
                onDismiss={() => setPendingInsight(null)}
                isConfirming={confirmInsight.isPending}
              />
            )}
          </div>

          {/* Input */}
          <AgentInput
            onSend={handleSend}
            onStop={stop}
            isLoading={isLoading}
            disabled={!projectId}
          />
        </>
      )}
    </aside>
  );
}

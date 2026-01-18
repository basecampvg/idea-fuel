'use client';

import { use, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/spinner';
import { INTERVIEW_MODE_LABELS } from '@forge/shared';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ideaId } = use(params);
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();

  // Get interviews for this idea
  const { data: interviews, isLoading: interviewLoading } =
    trpc.interview.listByIdea.useQuery({ ideaId });

  // Find the active (in-progress) interview
  const activeInterview = interviews?.find((i) => i.status === 'IN_PROGRESS');

  // Chat mutation - sends user message and gets AI response
  const sendMessage = trpc.interview.chat.useMutation({
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      setInput('');
      utils.interview.listByIdea.invalidate({ ideaId });
    },
    onSettled: () => {
      setIsTyping(false);
    },
  });

  // Complete interview mutation
  const completeInterview = trpc.interview.complete.useMutation({
    onSuccess: () => {
      router.push(`/ideas/${ideaId}`);
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeInterview?.messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Parse messages from JSON
  const messages: Message[] = activeInterview?.messages
    ? (activeInterview.messages as unknown as Message[])
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeInterview || sendMessage.isPending) return;

    sendMessage.mutate({
      interviewId: activeInterview.id,
      content: input.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (interviewLoading) {
    return <LoadingScreen message="Loading interview..." />;
  }

  if (!activeInterview) {
    return (
      <div className="mx-auto max-w-[1120px] space-y-6">
        <Link
          href={`/ideas/${ideaId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Idea
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No active interview found.</p>
            <Link href={`/ideas/${ideaId}`}>
              <Button className="mt-4">Go Back to Idea</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress =
    activeInterview.maxTurns > 0
      ? Math.round((activeInterview.currentTurn / activeInterview.maxTurns) * 100)
      : 0;
  const isComplete = activeInterview.status === 'COMPLETE';

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link
            href={`/ideas/${ideaId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Idea
          </Link>
          <h1 className="mt-1 text-xl font-bold text-foreground">
            {INTERVIEW_MODE_LABELS[activeInterview.mode]} Interview
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Turn {activeInterview.currentTurn} of {activeInterview.maxTurns}
            </p>
            <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {activeInterview.currentTurn >= activeInterview.maxTurns - 1 && !isComplete && (
            <Button
              variant="outline"
              onClick={() => completeInterview.mutate({ id: activeInterview.id })}
              isLoading={completeInterview.isPending}
            >
              Complete Interview
            </Button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.role === 'system'
                      ? 'bg-muted text-muted-foreground italic'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.1s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        {/* Input */}
        {!isComplete && (
          <div className="border-t border-border p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                rows={2}
                className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={sendMessage.isPending}
              />
              <Button
                type="submit"
                disabled={!input.trim() || sendMessage.isPending}
                isLoading={sendMessage.isPending}
              >
                Send
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        )}

        {isComplete && (
          <div className="border-t border-border bg-success/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-success">Interview Complete</p>
                <p className="text-sm text-success/80">
                  Your responses have been recorded. You can now start research.
                </p>
              </div>
              <Link href={`/ideas/${ideaId}`}>
                <Button>View Idea</Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

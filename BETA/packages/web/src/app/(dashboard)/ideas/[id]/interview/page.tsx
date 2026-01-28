'use client';

import { use, useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import { INTERVIEW_MODE_LABELS } from '@forge/shared';
import { ArrowUp, Paperclip, TrendingUp, ArrowLeft, X } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Animation states for question transitions
type AnimationState = 'entering' | 'visible' | 'exiting';

// Question display component - parses and highlights key parts
function QuestionDisplay({ question }: { question: string }) {
  // Split the question to highlight the actual question part
  const lines = question.split('\n').filter(line => line.trim());

  // Find the main question (line with ?)
  const questionLine = lines.find(line => line.includes('?')) || lines[lines.length - 1] || '';
  const contextLines = lines.filter(line => line !== questionLine);

  // Extract any example text in parentheses from question
  const questionMatch = questionLine.match(/^(.+?\?)(\s*\(.*\))?$/);
  const mainQuestion = questionMatch ? questionMatch[1] : questionLine;
  const example = questionMatch ? questionMatch[2]?.trim() : '';

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Context/intro lines */}
      {contextLines.length > 0 && (
        <p className="text-lg text-foreground leading-relaxed">
          {contextLines.map((line, i) => {
            // Highlight text in bold markers
            const parts = line.split(/\*\*(.*?)\*\*/g);
            return (
              <span key={i}>
                {parts.map((part, j) =>
                  j % 2 === 1 ? (
                    <span key={j} className="text-primary font-semibold">{part}</span>
                  ) : (
                    part
                  )
                )}
                {i < contextLines.length - 1 && <br />}
              </span>
            );
          })}
        </p>
      )}

      {/* Main question - highlighted */}
      <p className="text-lg md:text-2xl font-medium leading-relaxed">
        <span className="text-primary">{mainQuestion}</span>
        {example && (
          <span className="text-muted-foreground text-lg"> {example}</span>
        )}
      </p>
    </div>
  );
}

export default function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ideaId } = use(params);
  const router = useRouter();
  const [responseInput, setResponseInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [animationState, setAnimationState] = useState<AnimationState>('entering');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();

  // Get interviews for this idea
  const { data: interviews, isLoading: interviewLoading } =
    trpc.interview.listByIdea.useQuery({ ideaId });

  // Get idea details for title
  const { data: idea } = trpc.idea.get.useQuery({ id: ideaId });

  // Find the active (in-progress) interview
  const activeInterview = interviews?.find((i) => i.status === 'IN_PROGRESS');

  // Parse messages from JSON
  const messages: Message[] = activeInterview?.messages
    ? (activeInterview.messages as unknown as Message[])
    : [];

  // Get the latest assistant message as the current question
  const latestQuestion = messages
    .filter(m => m.role === 'assistant')
    .pop()?.content || '';

  // Initialize question state
  useEffect(() => {
    if (latestQuestion && !currentQuestion) {
      setCurrentQuestion(latestQuestion);
      // Trigger enter animation after a short delay
      setTimeout(() => setAnimationState('visible'), 100);
    }
  }, [latestQuestion, currentQuestion]);

  // Chat mutation - sends user message and gets AI response
  const sendMessage = trpc.interview.chat.useMutation({
    onSuccess: (result) => {
      utils.interview.listByIdea.invalidate({ ideaId });

      // Check if interview is complete
      if (result.interview.status === 'COMPLETE') {
        setTimeout(() => {
          router.push(`/ideas/${ideaId}`);
        }, 500);
        return;
      }

      // Set new question and trigger enter animation
      if (result.assistantMessage) {
        setCurrentQuestion(result.assistantMessage.content);
      }

      setAnimationState('entering');
      setTimeout(() => {
        setAnimationState('visible');
        setIsThinking(false);
      }, 50);
    },
    onError: () => {
      setAnimationState('visible');
      setIsThinking(false);
    },
  });

  // Complete interview mutation
  const completeInterview = trpc.interview.complete.useMutation({
    onSuccess: () => {
      router.push(`/ideas/${ideaId}`);
    },
  });

  // Focus input when animation becomes visible
  useEffect(() => {
    if (animationState === 'visible' && !isThinking) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [animationState, isThinking, currentQuestion]);

  // Handle submitting response
  const handleSubmitResponse = async () => {
    if (!responseInput.trim() || !activeInterview || sendMessage.isPending) return;

    const userResponse = responseInput.trim();
    setResponseInput('');

    // Start exit animation
    setAnimationState('exiting');
    setIsThinking(true);

    // Wait for exit animation
    await new Promise(resolve => setTimeout(resolve, 400));

    sendMessage.mutate({
      interviewId: activeInterview.id,
      content: userResponse,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitResponse();
    }
  };

  const handleCompleteInterview = async () => {
    if (!activeInterview) return;

    try {
      await completeInterview.mutateAsync({ id: activeInterview.id });
    } catch (error) {
      console.error('Failed to complete interview:', error);
    }
  };

  if (interviewLoading) {
    return <LoadingScreen message="Loading interview..." />;
  }

  if (!activeInterview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No active interview found.</p>
          <Link
            href={`/ideas/${ideaId}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Idea
          </Link>
        </div>
      </div>
    );
  }

  const progress = activeInterview.maxTurns > 0
    ? Math.round((activeInterview.currentTurn / activeInterview.maxTurns) * 100)
    : 0;

  const confidenceScore = Math.min(100, Math.round((activeInterview.currentTurn / activeInterview.maxTurns) * 100));

  // Get phase label based on progress
  const getPhaseLabel = () => {
    if (activeInterview.currentTurn === 0) return 'Starting';
    if (activeInterview.currentTurn < activeInterview.maxTurns * 0.3) return 'Discovery';
    if (activeInterview.currentTurn < activeInterview.maxTurns * 0.7) return 'Deep Dive';
    return 'Wrapping Up';
  };

  const ideaTitle = idea?.title || 'Your Idea';
  const interviewMode = activeInterview.mode;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 relative z-10 min-h-[calc(100vh-4rem)]">
      {/* Top Progress Bar */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg">
          <TrendingUp className="h-4 w-4 text-accent" />
          <span className="text-sm text-accent font-medium">Confidence</span>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-700 ease-out"
              style={{ width: `${confidenceScore}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">{getPhaseLabel()}</span>
          <span className="text-sm text-muted-foreground">{activeInterview.currentTurn}/{activeInterview.maxTurns}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-[1120px] flex flex-col items-center justify-center flex-1">
        {/* Idea Title & Mode */}
        <p className="text-muted-foreground text-sm mb-6">
          {interviewMode === 'IN_DEPTH' ? 'Forging' : 'Exploring'}: {ideaTitle}
        </p>

        {/* Question Display - Animated */}
        <div
          className={`
            text-center mb-12 transition-all duration-500 ease-out
            ${animationState === 'entering' ? 'opacity-0 translate-y-8' : ''}
            ${animationState === 'visible' ? 'opacity-100 translate-y-0' : ''}
            ${animationState === 'exiting' ? 'opacity-0 -translate-y-8' : ''}
          `}
        >
          {isThinking ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex space-x-2">
                <div className="h-3 w-3 rounded-full bg-primary animate-bounce" />
                <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:0.15s]" />
                <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:0.3s]" />
              </div>
              <p className="text-muted-foreground">Thinking...</p>
            </div>
          ) : (
            <QuestionDisplay question={currentQuestion} />
          )}
        </div>

        {/* Input Area */}
        <div
          className={`
            w-full max-w-2xl transition-all duration-500 ease-out
            ${animationState === 'entering' ? 'opacity-0 translate-y-4' : ''}
            ${animationState === 'visible' ? 'opacity-100 translate-y-0' : ''}
            ${animationState === 'exiting' ? 'opacity-0' : ''}
          `}
        >
          <div className="rounded-2xl bg-card border border-border p-4 shadow-lg">
            <textarea
              ref={inputRef}
              value={responseInput}
              onChange={(e) => setResponseInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              rows={3}
              className="
                w-full bg-transparent text-foreground text-base
                placeholder:text-muted-foreground/60
                resize-none border-0 focus:outline-none focus:ring-0
                min-h-[80px] leading-relaxed
              "
              disabled={sendMessage.isPending || isThinking}
            />

            {/* Input Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
                <span className="text-sm">Attach</span>
              </button>

              <div className="flex items-center gap-2">
                {activeInterview.currentTurn >= 3 && (
                  <button
                    onClick={handleCompleteInterview}
                    disabled={completeInterview.isPending}
                    className="px-3 py-1.5 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Skip to research
                  </button>
                )}

                <button
                  onClick={handleSubmitResponse}
                  disabled={!responseInput.trim() || sendMessage.isPending || isThinking}
                  className="
                    p-2.5 rounded-xl bg-muted text-muted-foreground
                    hover:bg-primary hover:text-primary-foreground
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                  "
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Hint */}
          <p className="text-center text-xs text-muted-foreground mt-3">
            Press Enter to send, Shift+Enter for new line
          </p>

          {/* Back to Idea link - below input */}
          <Link
            href={`/ideas/${ideaId}`}
            className="flex items-center gap-2 mt-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Idea</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

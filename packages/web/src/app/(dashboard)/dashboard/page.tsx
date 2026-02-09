'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useSubscription } from '@/components/subscription/use-subscription';
import { LoadingScreen } from '@/components/ui/spinner';
import { Flame, Feather, Zap, Bookmark, ArrowUp, TrendingUp, Paperclip, Sparkles, FileText, Target, TrendingUp as TrendUp, DollarSign, Lock, HelpCircle, X } from 'lucide-react';
import { PROJECT_TITLE_MAX } from '@forge/shared';

type InterviewMode = 'SPARK' | 'LIGHT' | 'IN_DEPTH';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// Animation states for question transitions
type AnimationState = 'entering' | 'visible' | 'exiting';

// Words to cycle through in the typewriter
const typewriterWords = [
  'business?',
  'startup?',
  'side project?',
  'venture?',
  'idea?',
];

// Typewriter component
function TypewriterText({ words }: { words: string[] }) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const currentWord = words[currentWordIndex];

  const typeSpeed = 100;
  const deleteSpeed = 60;
  const pauseAfterWord = 2000;

  const tick = useCallback(() => {
    if (!isDeleting) {
      if (displayText.length < currentWord.length) {
        setDisplayText(currentWord.substring(0, displayText.length + 1));
      } else {
        setTimeout(() => setIsDeleting(true), pauseAfterWord);
        return;
      }
    } else {
      if (displayText.length > 0) {
        setDisplayText(displayText.substring(0, displayText.length - 1));
      } else {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
        return;
      }
    }
  }, [displayText, isDeleting, currentWord, words.length]);

  useEffect(() => {
    const speed = isDeleting ? deleteSpeed : typeSpeed;
    const timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [tick, isDeleting]);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      setDisplayText(currentWord.charAt(0));
    }, 500);
    return () => clearTimeout(initialDelay);
  }, []);

  return (
    <span className="text-gradient font-semibold">
      {displayText}
      <span className="typewriter-cursor">|</span>
    </span>
  );
}

// Question display component - parses and highlights key parts
function QuestionDisplay({ question }: { question: string }) {
  // Split the question to highlight the actual question part
  // Usually questions end with ? and may have context before/after
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
        <p className="text-sm text-foreground leading-relaxed">
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
      <p className="text-lg font-medium leading-relaxed">
        <span className="text-primary">{mainQuestion}</span>
        {example && (
          <span className="text-muted-foreground text-sm"> {example}</span>
        )}
      </p>
    </div>
  );
}

// Action button definitions
interface ActionButton {
  id: InterviewMode | 'SAVE';
  icon: React.ReactNode;
  label: string;
  description: string;
}

const actionButtons: ActionButton[] = [
  {
    id: 'IN_DEPTH',
    icon: <Flame className="h-4 w-4" />,
    label: 'Forge',
    description: '65 questions - comprehensive analysis',
  },
  {
    id: 'LIGHT',
    icon: <Feather className="h-4 w-4" />,
    label: 'Light',
    description: '10 questions - essential insights',
  },
  {
    id: 'SPARK',
    icon: <Sparkles className="h-4 w-4" />,
    label: 'Spark',
    description: 'Quick validation - demand & market sizing',
  },
  {
    id: 'SAVE',
    icon: <Bookmark className="h-4 w-4" />,
    label: 'Save',
    description: 'Save to vault for later',
  },
];

// Report type indicators with icons
const reportTypes = [
  { name: 'Business Plan', icon: FileText },
  { name: 'Positioning', icon: Target },
  { name: 'Competitive Analysis', icon: TrendUp },
  { name: 'Financial Model', icon: DollarSign },
];

const isDev = process.env.NODE_ENV === 'development';

export default function DashboardPage() {
  const router = useRouter();
  const { canCreateIdea, canAccessMode, showUpgradePrompt, currentProjectCount, features } = useSubscription();
  const [ideaDescription, setIdeaDescription] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('IN_DEPTH');
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showPromptHint, setShowPromptHint] = useState(false);
  const [promptHintDismissed, setPromptHintDismissed] = useState(false);

  // Interview state
  const [interviewActive, setInterviewActive] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentInterviewId, setCurrentInterviewId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [ideaTitle, setIdeaTitle] = useState<string>('');
  const [responseInput, setResponseInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [interviewModeState, setInterviewModeState] = useState<InterviewMode | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [maxTurns, setMaxTurns] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [animationState, setAnimationState] = useState<AnimationState>('visible');

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: user, isLoading: userLoading, error: userError } = trpc.user.me.useQuery(
    undefined,
    { retry: isDev ? false : 3 }
  );
  const createProject = trpc.project.create.useMutation();
  const startInterview = trpc.project.startInterview.useMutation();
  const startResearch = trpc.research.start.useMutation();
  const startSpark = trpc.research.startSpark.useMutation();
  const sendMessage = trpc.interview.chat.useMutation();
  const completeInterview = trpc.interview.complete.useMutation();

  // Focus input when interview becomes active or question changes
  useEffect(() => {
    if (interviewActive && animationState === 'visible') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [interviewActive, animationState, currentQuestion]);

  // Auto-show prompt hint for first 5 visits
  useEffect(() => {
    const HINT_STORAGE_KEY = 'forge_prompt_hint_views';
    const viewCount = parseInt(localStorage.getItem(HINT_STORAGE_KEY) || '0', 10);

    if (viewCount < 5) {
      setShowPromptHint(true);
      localStorage.setItem(HINT_STORAGE_KEY, String(viewCount + 1));
    }
  }, []);

  if (userLoading && !userError) {
    return <LoadingScreen message="Loading..." />;
  }

  const firstName = user?.name?.split(' ')[0] || (isDev ? 'Developer' : 'there');
  const isSubmitting = createProject.isPending || startInterview.isPending || startResearch.isPending || startSpark.isPending || isExecuting;
  const canSubmit = ideaTitle.trim().length >= 1 && ideaDescription.trim().length >= 10;

  // Execute the selected mode
  const executeSelectedMode = async () => {
    if (!canSubmit || isSubmitting) return;

    // Check idea limit
    if (!canCreateIdea(currentProjectCount)) {
      showUpgradePrompt({
        type: 'idea_limit',
        currentCount: currentProjectCount,
        limit: features.maxIdeas,
      });
      return;
    }

    // Check interview mode access (for IN_DEPTH)
    if (selectedMode === 'IN_DEPTH' && !canAccessMode('IN_DEPTH')) {
      showUpgradePrompt({ type: 'interview_mode', mode: 'IN_DEPTH' });
      return;
    }

    setIsExecuting(true);

    try {
      const project = await createProject.mutateAsync({
        title: ideaTitle.trim(),
        description: ideaDescription,
      });

      if (selectedMode === 'SAVE') {
        router.push(`/projects/${project.id}`);
      } else if (selectedMode === 'SPARK') {
        // Spark mode - quick validation pipeline
        await startInterview.mutateAsync({ projectId: project.id, mode: 'SPARK' });
        await startSpark.mutateAsync({ projectId: project.id });
        router.push(`/projects/${project.id}`);
      } else {
        // LIGHT or IN_DEPTH - start inline interview
        const result = await startInterview.mutateAsync({
          projectId: project.id,
          mode: selectedMode as InterviewMode
        });

        // Extract first AI message as the current question
        const messages = result.interview.messages as unknown as ChatMessage[];
        const firstQuestion = messages?.find(m => m.role === 'assistant')?.content || '';

        // Switch to interview mode
        setCurrentProjectId(project.id);
        setCurrentInterviewId(result.interview.id);
        setInterviewModeState(selectedMode as InterviewMode);
        setMaxTurns(result.interview.maxTurns);
        setCurrentTurn(result.interview.currentTurn);
        setCurrentQuestion(firstQuestion);
        setConfidenceScore(0);
        setAnimationState('entering');
        setInterviewActive(true);
        setIsExecuting(false);

        // Trigger enter animation
        setTimeout(() => setAnimationState('visible'), 50);
      }
    } catch (error) {
      console.error('Failed to process project:', error);
      setIsExecuting(false);
    }
  };

  // Handle submitting response
  const handleSubmitResponse = async () => {
    if (!responseInput.trim() || !currentInterviewId || sendMessage.isPending) return;

    const userResponse = responseInput.trim();
    setResponseInput('');

    // Start exit animation
    setAnimationState('exiting');
    setIsThinking(true);

    try {
      // Wait for exit animation
      await new Promise(resolve => setTimeout(resolve, 400));

      const result = await sendMessage.mutateAsync({
        interviewId: currentInterviewId,
        content: userResponse,
      });

      // Update state with new question
      setCurrentTurn(result.interview.currentTurn);

      // Calculate confidence based on turns completed
      const newConfidence = Math.min(100, Math.round((result.interview.currentTurn / maxTurns) * 100));
      setConfidenceScore(newConfidence);

      // Check if interview is complete
      if (result.interview.status === 'COMPLETE') {
        setTimeout(() => {
          router.push(`/projects/${currentProjectId}`);
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

    } catch (error) {
      console.error('Failed to send response:', error);
      setAnimationState('visible');
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitResponse();
    }
  };

  const handleCompleteInterview = async () => {
    if (!currentInterviewId) return;

    try {
      await completeInterview.mutateAsync({ id: currentInterviewId });
      router.push(`/projects/${currentProjectId}`);
    } catch (error) {
      console.error('Failed to complete interview:', error);
    }
  };

  // Get phase label based on progress
  const getPhaseLabel = () => {
    if (currentTurn === 0) return 'Starting';
    if (currentTurn < maxTurns * 0.3) return 'Discovery';
    if (currentTurn < maxTurns * 0.7) return 'Deep Dive';
    return 'Wrapping Up';
  };

  // Interview Mode UI - Single question at a time with animations
  if (interviewActive) {
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
            <span className="text-sm text-muted-foreground">{currentTurn}/{maxTurns}</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full max-w-[1120px] flex flex-col items-center justify-center flex-1">
          {/* Idea Title */}
          <p className="text-muted-foreground text-sm mb-6">
            {interviewModeState === 'IN_DEPTH' ? 'Forging' : 'Exploring'}: {ideaTitle}
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
                  w-full bg-transparent text-foreground text-sm
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
                  {currentTurn >= 3 && (
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
          </div>
        </div>
      </div>
    );
  }

  // Normal Dashboard UI
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative z-10 min-h-screen">
      {/* Greeting Section */}
      <div className="text-center mb-10 animate-fade-in-up">
        <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase mb-4">
          Welcome back, {firstName}
        </p>
        <h1 className="font-display text-2xl md:text-2xl font-semibold tracking-tight text-foreground mb-5 leading-[1.1]">
          What's your next
          <br />
          <TypewriterText words={typewriterWords} />
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
          Transform ideas into comprehensive business intelligence.
        </p>
      </div>

      {/* Idea Input Card */}
      <div className="w-full max-w-[1120px] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div
          className={`
            relative rounded-2xl bg-card/80 backdrop-blur-sm border transition-all duration-500
            ${isFocused
              ? 'border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.15)]'
              : 'border-border/60 shadow-xl shadow-black/5'
            }
          `}
        >
          {/* Subtle gradient overlay on focus */}
          <div
            className={`
              absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5
              transition-opacity duration-500 pointer-events-none
              ${isFocused ? 'opacity-100' : 'opacity-0'}
            `}
          />

          <div className="relative p-6">
            {/* Title Input */}
            <div className="relative mb-1">
              <input
                type="text"
                value={ideaTitle}
                onChange={(e) => {
                  if (e.target.value.length <= PROJECT_TITLE_MAX) setIdeaTitle(e.target.value);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Name your idea"
                className="
                  w-full bg-transparent text-foreground text-base font-semibold
                  placeholder:text-muted-foreground/40 placeholder:font-normal
                  border-0 focus:outline-none focus:ring-0
                  leading-relaxed
                "
                maxLength={PROJECT_TITLE_MAX}
                disabled={isSubmitting}
              />
              {ideaTitle.length > 0 && (
                <span className={`absolute right-0 top-1/2 -translate-y-1/2 text-xs tabular-nums ${ideaTitle.length >= PROJECT_TITLE_MAX ? 'text-destructive' : 'text-muted-foreground/40'}`}>
                  {ideaTitle.length}/{PROJECT_TITLE_MAX}
                </span>
              )}
            </div>

            {/* Title/Description divider */}
            <div className="h-px bg-border/30 mb-4" />

            {/* Textarea */}
            <div className="relative">
              {/* Prompt hint tooltip */}
              <div className="absolute top-0 right-0 z-10">
                <button
                  type="button"
                  onMouseEnter={() => !promptHintDismissed && setShowPromptHint(true)}
                  onMouseLeave={() => !promptHintDismissed && setShowPromptHint(false)}
                  onClick={() => setShowPromptHint(!showPromptHint)}
                  className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  aria-label="Show prompt structure hint"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                {showPromptHint && (
                  <div className="absolute top-full right-0 z-50 mt-1 w-72 animate-fade-in-up">
                    <div className="rounded-xl bg-card border border-border px-4 py-3 shadow-xl text-left relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPromptHint(false);
                          setPromptHintDismissed(true);
                        }}
                        className="absolute top-2 right-2 p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
                        aria-label="Close hint"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="font-medium text-foreground text-xs mb-2 pr-6">For best results, include:</div>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <p><span className="text-foreground font-medium">Idea:</span> Your core concept</p>
                        <p><span className="text-foreground font-medium">Problem:</span> What pain point does it solve?</p>
                        <p><span className="text-foreground font-medium">Core use cases:</span> 2-3 primary ways users would use it</p>
                        <p><span className="text-foreground font-medium">Target users:</span> Who is this for?</p>
                        <p><span className="text-foreground font-medium">Business model:</span> How might it make money?</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <textarea
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Describe your business idea in a few sentences..."
                className="
                  w-full bg-transparent text-foreground text-sm
                  placeholder:text-muted-foreground/50
                  resize-none border-0 focus:outline-none focus:ring-0
                  min-h-[100px] leading-relaxed
                "
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-border/50 my-4" />

            {/* Action Row */}
            <div className="flex items-center justify-between gap-3">
              {/* Mode Selector - icon only */}
              <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border/50">
                {actionButtons.map((mode) => {
                  const isSelected = selectedMode === mode.id;
                  const isHovered = hoveredMode === mode.id;
                  const isLocked = mode.id === 'IN_DEPTH' && !canAccessMode('IN_DEPTH');

                  // Mode-specific colors with transparency
                  const modeColors: Record<string, string> = {
                    'IN_DEPTH': 'bg-primary/20 text-primary ring-1 ring-primary/50',
                    'LIGHT': 'bg-primary/20 text-primary/70 ring-1 ring-primary/50',
                    'SPARK': 'bg-primary/20 text-primary/50 ring-1 ring-primary/50',
                    'SAVE': 'bg-primary/20 text-primary ring-1 ring-primary/50',
                  };

                  return (
                    <div key={mode.id} className="relative">
                      <button
                        onClick={() => setSelectedMode(mode.id)}
                        onMouseEnter={() => setHoveredMode(mode.id)}
                        onMouseLeave={() => setHoveredMode(null)}
                        className={`
                          flex items-center justify-center p-2.5 rounded-lg transition-all relative
                          ${isSelected
                            ? modeColors[mode.id] || 'bg-primary text-foreground shadow-sm'
                            : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
                          }
                          ${isLocked ? 'opacity-60' : ''}
                        `}
                      >
                        {mode.icon}
                        {isLocked && (
                          <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-primary" />
                        )}
                      </button>

                      {/* Tooltip on hover */}
                      {isHovered && (
                        <div className="absolute bottom-full left-1/2 z-50 mb-2.5 -translate-x-1/2 whitespace-nowrap pointer-events-none animate-fade-in-up">
                          <div className="rounded-xl bg-card border border-border px-3 py-2 shadow-xl">
                            <div className="font-medium text-foreground text-xs flex items-center gap-1.5">
                              {mode.label}
                              {isLocked && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">PRO</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{mode.description}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Execute Button */}
              <button
                onClick={executeSelectedMode}
                disabled={isSubmitting || !canSubmit}
                className="
                  p-2.5 rounded-xl bg-primary text-primary-foreground
                  shadow-lg shadow-primary/25
                  hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]
                  active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100
                  transition-all duration-200
                "
              >
                {isSubmitting ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <ArrowUp className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Character hint */}
            {ideaDescription.length > 0 && ideaDescription.length < 10 && (
              <p className="text-xs text-muted-foreground/60 mt-3">
                {10 - ideaDescription.length} more characters needed
              </p>
            )}
          </div>
        </div>

        {/* Report Types */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <span className="text-xs text-muted-foreground/60 mr-1">Generates:</span>
          {reportTypes.map((report, index) => {
            const Icon = report.icon;
            return (
              <div
                key={report.name}
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                  text-xs font-medium
                  bg-accent/10 text-accent/80
                  border border-accent/20
                "
              >
                <Icon className="w-3 h-3" />
                <span>{report.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-12 text-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-center gap-6 text-sm">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
            <Sparkles className="w-4 h-4 text-accent group-hover:text-primary transition-colors" />
            <span>Refer friends for credits</span>
          </button>
        </div>
      </div>
    </div>
  );
}

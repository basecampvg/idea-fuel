'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Feather, Microscope, Sparkles, Zap, Clock, ArrowRight, Lightbulb, Lock, Pencil, Check, X } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useSubscription } from '@/components/subscription/use-subscription';
import { INTERVIEW_MODE_LABELS, INTERVIEW_MODE_DESCRIPTIONS, PROJECT_DESC_MAX, PROJECT_DESC_MIN } from '@forge/shared';
import type { ResearchEngine } from '@forge/shared';

interface StatusCapturedProps {
  project: {
    id: string;
    title: string;
    description: string;
  };
}

export function StatusCaptured({ project }: StatusCapturedProps) {
  const router = useRouter();
  const { canAccessMode, showUpgradePrompt } = useSubscription();

  const canAccessInDepth = canAccessMode('IN_DEPTH');

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(project.description || '');
  const [researchEngine, setResearchEngine] = useState<ResearchEngine>('OPENAI');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();

  const startInterview = trpc.project.startInterview.useMutation({
    onSuccess: (data) => {
      if (data.skipToResearch) {
        // Spark mode skips interview — go back to project page which will show researching state
        utils.project.get.invalidate({ id: project.id });
        router.push(`/projects/${project.id}`);
      } else {
        router.push(`/projects/${project.id}/interview`);
      }
    },
  });

  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate({ id: project.id });
      utils.project.list.invalidate();
    },
  });

  useEffect(() => {
    if (isEditingDesc && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditingDesc]);

  const handleSaveDesc = () => {
    const trimmed = descValue.trim();
    if (trimmed === (project.description || '').trim()) {
      setIsEditingDesc(false);
      return;
    }
    if (trimmed.length < PROJECT_DESC_MIN) {
      // Don't save if too short
      return;
    }
    updateProject.mutate(
      { id: project.id, data: { description: trimmed } },
      { onSettled: () => setIsEditingDesc(false) }
    );
  };

  const handleCancelDesc = () => {
    setDescValue(project.description || '');
    setIsEditingDesc(false);
  };

  const handleDescKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelDesc();
    }
    // Ctrl/Cmd+Enter to save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveDesc();
    }
  };

  const handleInDepthClick = () => {
    if (!canAccessInDepth) {
      showUpgradePrompt({ type: 'interview_mode', mode: 'IN_DEPTH' });
      return;
    }
    startInterview.mutate({ projectId: project.id, mode: 'IN_DEPTH', researchEngine });
  };

  const descTooShort = descValue.trim().length > 0 && descValue.trim().length < PROJECT_DESC_MIN;

  return (
    <div className="space-y-6">
      {/* Hero Section - Project Overview */}
      <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-border p-6 relative overflow-hidden">
        {/* Decorative gradient orb */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Idea</span>
            </div>
            {!isEditingDesc && (
              <button
                onClick={() => setIsEditingDesc(true)}
                className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-all"
                title="Edit description"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isEditingDesc ? (
            <div className="space-y-3">
              <textarea
                ref={textareaRef}
                value={descValue}
                onChange={(e) => {
                  if (e.target.value.length <= PROJECT_DESC_MAX) {
                    setDescValue(e.target.value);
                  }
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={handleDescKeyDown}
                maxLength={PROJECT_DESC_MAX}
                rows={3}
                disabled={updateProject.isPending}
                className="
                  w-full text-sm text-foreground/80 bg-background/50
                  border border-border rounded-xl p-3
                  focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                  resize-none leading-relaxed
                  disabled:opacity-50
                "
                placeholder="Describe your idea..."
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
                  {descTooShort && (
                    <span className="text-destructive">
                      Min {PROJECT_DESC_MIN} characters
                    </span>
                  )}
                  <span className={descValue.length >= PROJECT_DESC_MAX ? 'text-destructive' : ''}>
                    {descValue.length}/{PROJECT_DESC_MAX}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/40">
                    Ctrl+Enter to save
                  </span>
                  <button
                    onClick={handleCancelDesc}
                    disabled={updateProject.isPending}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSaveDesc}
                    disabled={descTooShort || !descValue.trim() || updateProject.isPending}
                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm">
              {project.description || <span className="italic text-muted-foreground/40">No description yet. Click the pencil to add one.</span>}
            </p>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="rounded-2xl bg-background border border-border p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Ready to Discover?</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Run a quick Spark validation or start an AI-powered interview to uncover market insights, validate your idea, and build a comprehensive business plan.
          </p>
        </div>

        {/* Interview Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Spark - Quick Validation (no interview) */}
          <button
            onClick={() => startInterview.mutate({ projectId: project.id, mode: 'SPARK', researchEngine })}
            disabled={startInterview.isPending}
            className="group relative rounded-xl bg-card border border-border p-5 text-left transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-amber-500 transition-colors">
                  {INTERVIEW_MODE_LABELS.SPARK}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>No interview</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {INTERVIEW_MODE_DESCRIPTIONS.SPARK}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Instant
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Key Signals
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          {/* In-Depth Interview (Recommended) - may be locked for FREE tier */}
          <button
            onClick={handleInDepthClick}
            disabled={startInterview.isPending}
            className={`
              group relative rounded-xl bg-gradient-to-br from-card to-background border p-5 text-left transition-all duration-300 overflow-hidden
              ${canAccessInDepth
                ? 'border-primary/30 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10'
                : 'border-border opacity-80'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {/* Recommended badge or PRO badge */}
            <div className="absolute top-0 right-0">
              {canAccessInDepth ? (
                <div className="bg-gradient-to-r from-primary to-accent text-foreground text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                  Recommended
                </div>
              ) : (
                <div className="bg-primary/20 border border-primary/40 text-primary text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  PRO
                </div>
              )}
            </div>

            {/* Glow effect on hover */}
            {canAccessInDepth && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            {/* Lock overlay for FREE users */}
            {!canAccessInDepth && (
              <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Upgrade to unlock</span>
                </div>
              </div>
            )}

            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center ${canAccessInDepth ? 'group-hover:scale-110' : ''} transition-transform`}>
                  <Microscope className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold text-foreground ${canAccessInDepth ? 'group-hover:text-primary' : ''} transition-colors`}>
                    {INTERVIEW_MODE_LABELS.IN_DEPTH}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>15+ questions</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {INTERVIEW_MODE_DESCRIPTIONS.IN_DEPTH}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                    Full Analysis
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent/10 text-accent border border-accent/20">
                    31 Data Points
                  </span>
                </div>
                <ArrowRight className={`w-4 h-4 text-muted-foreground ${canAccessInDepth ? 'group-hover:text-primary group-hover:translate-x-1' : ''} transition-all`} />
              </div>
            </div>
          </button>

          {/* Light Interview - always available */}
          <button
            onClick={() => startInterview.mutate({ projectId: project.id, mode: 'LIGHT', researchEngine })}
            disabled={startInterview.isPending}
            className="group relative rounded-xl bg-card border border-border p-5 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Feather className="w-5 h-5 text-primary/60" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary/60 transition-colors">
                  {INTERVIEW_MODE_LABELS.LIGHT}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>5 questions</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {INTERVIEW_MODE_DESCRIPTIONS.LIGHT}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary/60 border border-primary/20">
                  Quick Start
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary/50 border border-primary/20">
                  Essential Only
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary/60 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {/* Research Engine Toggle */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Research Engine</span>
            <div className="inline-flex rounded-full bg-muted/50 p-1 border border-border">
              <button
                onClick={() => setResearchEngine('OPENAI')}
                className={`
                  px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                  ${researchEngine === 'OPENAI'
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                OpenAI Deep Research
              </button>
              <button
                onClick={() => setResearchEngine('PERPLEXITY')}
                className={`
                  px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                  ${researchEngine === 'PERPLEXITY'
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                Perplexity Sonar
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
              {researchEngine === 'OPENAI'
                ? 'Uses OpenAI o3 deep research for comprehensive analysis with web search.'
                : 'Uses Perplexity Sonar deep research for fast, citation-rich analysis.'
              }
            </p>
          </div>
        </div>

        {/* What to expect */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            After the interview, we'll analyze your responses and generate comprehensive market research, competitor analysis, and actionable insights.
          </p>
        </div>
      </div>
    </div>
  );
}

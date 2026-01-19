'use client';

import { useRouter } from 'next/navigation';
import { Feather, Microscope, Sparkles, Clock, ArrowRight, Lightbulb, Lock } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useSubscription } from '@/components/subscription/use-subscription';
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
  const { canAccessMode, showUpgradePrompt } = useSubscription();

  const canAccessInDepth = canAccessMode('IN_DEPTH');

  const startInterview = trpc.idea.startInterview.useMutation({
    onSuccess: () => {
      router.push(`/ideas/${idea.id}/interview`);
    },
  });

  const handleInDepthClick = () => {
    if (!canAccessInDepth) {
      showUpgradePrompt({ type: 'interview_mode', mode: 'IN_DEPTH' });
      return;
    }
    startInterview.mutate({ ideaId: idea.id, mode: 'IN_DEPTH' });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section - Idea Overview */}
      <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-border p-6 relative overflow-hidden">
        {/* Decorative gradient orb */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#e91e8c]/10 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#e91e8c]/20 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-[#e91e8c]" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Idea</span>
          </div>

          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm">
            {idea.description}
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="rounded-2xl bg-background border border-border p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#e91e8c]/20 to-[#8b5cf6]/20 mb-4">
            <Sparkles className="w-6 h-6 text-[#e91e8c]" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Ready to Discover?</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Start an AI-powered interview to uncover market insights, validate your idea, and build a comprehensive business plan.
          </p>
        </div>

        {/* Interview Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* In-Depth Interview (Recommended) - may be locked for FREE tier */}
          <button
            onClick={handleInDepthClick}
            disabled={startInterview.isPending}
            className={`
              group relative rounded-xl bg-gradient-to-br from-card to-background border p-5 text-left transition-all duration-300 overflow-hidden
              ${canAccessInDepth
                ? 'border-[#e91e8c]/30 hover:border-[#e91e8c]/60 hover:shadow-lg hover:shadow-[#e91e8c]/10'
                : 'border-border opacity-80'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {/* Recommended badge or PRO badge */}
            <div className="absolute top-0 right-0">
              {canAccessInDepth ? (
                <div className="bg-gradient-to-r from-[#e91e8c] to-[#8b5cf6] text-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                  Recommended
                </div>
              ) : (
                <div className="bg-[#e91e8c]/20 border border-[#e91e8c]/40 text-[#e91e8c] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  PRO
                </div>
              )}
            </div>

            {/* Glow effect on hover */}
            {canAccessInDepth && (
              <div className="absolute inset-0 bg-gradient-to-br from-[#e91e8c]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            {/* Lock overlay for FREE users */}
            {!canAccessInDepth && (
              <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#e91e8c]/10 border border-[#e91e8c]/30">
                  <Lock className="w-4 h-4 text-[#e91e8c]" />
                  <span className="text-sm font-medium text-[#e91e8c]">Upgrade to unlock</span>
                </div>
              </div>
            )}

            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full bg-[#e91e8c]/20 flex items-center justify-center ${canAccessInDepth ? 'group-hover:scale-110' : ''} transition-transform`}>
                  <Microscope className="w-5 h-5 text-[#e91e8c]" />
                </div>
                <div>
                  <h3 className={`text-base font-semibold text-foreground ${canAccessInDepth ? 'group-hover:text-[#e91e8c]' : ''} transition-colors`}>
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
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
                    Full Analysis
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20">
                    31 Data Points
                  </span>
                </div>
                <ArrowRight className={`w-4 h-4 text-muted-foreground ${canAccessInDepth ? 'group-hover:text-[#e91e8c] group-hover:translate-x-1' : ''} transition-all`} />
              </div>
            </div>
          </button>

          {/* Light Interview - always available */}
          <button
            onClick={() => startInterview.mutate({ ideaId: idea.id, mode: 'LIGHT' })}
            disabled={startInterview.isPending}
            className="group relative rounded-xl bg-card border border-border p-5 text-left transition-all duration-300 hover:border-[#4ecdc4]/40 hover:shadow-lg hover:shadow-[#4ecdc4]/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#4ecdc4]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Feather className="w-5 h-5 text-[#4ecdc4]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground group-hover:text-[#4ecdc4] transition-colors">
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
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#4ecdc4]/10 text-[#4ecdc4] border border-[#4ecdc4]/20">
                  Quick Start
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                  Essential Only
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#4ecdc4] group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {/* What to expect */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            After the interview, we'll analyze your responses and generate comprehensive market research, competitor analysis, and actionable insights.
          </p>
        </div>
      </div>
    </div>
  );
}

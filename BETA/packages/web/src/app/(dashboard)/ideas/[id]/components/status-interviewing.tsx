'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { INTERVIEW_MODE_LABELS } from '@forge/shared';
import {
  MessageCircle,
  ArrowRight,
  Lightbulb,
  ChevronDown,
  Clock,
  Target,
  Microscope,
  Feather,
  Sparkles,
  Lock,
  FileText,
  BarChart3,
  Users,
  TrendingUp,
  XCircle,
} from 'lucide-react';

interface Interview {
  id: string;
  mode: string;
  status: string;
  currentTurn: number;
  maxTurns: number;
  confidenceScore: number;
  lastActiveAt: Date;
}

interface StatusInterviewingProps {
  idea: {
    id: string;
    title: string;
    description: string;
    interviews?: Interview[];
  };
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

// Get the appropriate icon and colors for interview mode
function getModeConfig(mode: string) {
  if (mode === 'IN_DEPTH') {
    return {
      Icon: Microscope,
      color: '#e91e8c',
      bgColor: 'bg-[#e91e8c]/20',
      borderColor: 'border-[#e91e8c]/30',
      glowColor: 'shadow-[#e91e8c]/20',
    };
  }
  if (mode === 'LIGHT') {
    return {
      Icon: Feather,
      color: '#4ecdc4',
      bgColor: 'bg-[#4ecdc4]/20',
      borderColor: 'border-[#4ecdc4]/30',
      glowColor: 'shadow-[#4ecdc4]/20',
    };
  }
  // SPARK
  return {
    Icon: Sparkles,
    color: '#f59e0b',
    bgColor: 'bg-[#f59e0b]/20',
    borderColor: 'border-[#f59e0b]/30',
    glowColor: 'shadow-[#f59e0b]/20',
  };
}

export function StatusInterviewing({ idea }: StatusInterviewingProps) {
  const [showDescription, setShowDescription] = useState(false);
  const utils = trpc.useUtils();

  const activeInterview = idea.interviews?.find((i) => i.status === 'IN_PROGRESS');

  const abandonInterview = trpc.interview.abandon.useMutation({
    onSuccess: () => {
      utils.idea.get.invalidate({ id: idea.id });
    },
  });

  if (!activeInterview) {
    return null;
  }

  const progress = (activeInterview.currentTurn / activeInterview.maxTurns) * 100;
  const modeConfig = getModeConfig(activeInterview.mode);
  const ModeIcon = modeConfig.Icon;

  return (
    <div className="space-y-5">
      {/* Interview Progress Card */}
      <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-border p-6 relative overflow-hidden">
        {/* Animated gradient orb */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: `${modeConfig.color}10` }}
        />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full ${modeConfig.bgColor} flex items-center justify-center`}
              >
                <MessageCircle className="w-6 h-6" style={{ color: modeConfig.color }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Interview in Progress</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${modeConfig.bgColor} border ${modeConfig.borderColor}`}
                    style={{ color: modeConfig.color }}
                  >
                    <ModeIcon className="w-3 h-3" />
                    {INTERVIEW_MODE_LABELS[activeInterview.mode] || activeInterview.mode}
                  </span>
                </div>
              </div>
            </div>

            {/* Turn counter badge */}
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {activeInterview.currentTurn}
                <span className="text-muted-foreground text-lg">/{activeInterview.maxTurns}</span>
              </div>
              <span className="text-xs text-muted-foreground">turns</span>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(progress, 2)}%`,
                    background: `linear-gradient(90deg, ${modeConfig.color}, ${modeConfig.color}aa)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Confidence: <span className="text-foreground font-medium">{activeInterview.confidenceScore}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Last Active */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Last active: {formatTimeAgo(activeInterview.lastActiveAt)}</span>
            </div>

            {/* Continue Button */}
            <Link
              href={`/ideas/${idea.id}/interview`}
              className={`group flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl font-medium text-foreground transition-all duration-300 hover:shadow-lg ${modeConfig.glowColor}`}
              style={{
                background: `linear-gradient(135deg, ${modeConfig.color}, ${modeConfig.color}cc)`,
              }}
            >
              Continue Interview
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Abandon Button */}
            <button
              onClick={() => {
                if (confirm('Are you sure you want to abandon this interview? You can start a new one later.')) {
                  abandonInterview.mutate({ id: activeInterview.id });
                }
              }}
              disabled={abandonInterview.isPending}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-muted-foreground hover:text-[#ef4444] transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              {abandonInterview.isPending ? 'Abandoning...' : 'Abandon interview'}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Idea Description */}
      <div className="rounded-2xl bg-background border border-border overflow-hidden">
        <button
          onClick={() => setShowDescription(!showDescription)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-card/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e91e8c]/20 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-[#e91e8c]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Your Idea</h3>
              {!showDescription && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
                  {idea.description.slice(0, 80)}...
                </p>
              )}
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
              showDescription ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showDescription && (
          <div className="px-5 pb-5 pt-0">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed pl-[52px]">
              {idea.description}
            </p>
          </div>
        )}
      </div>

      {/* Coming Next - Locked Features */}
      <div className="rounded-2xl bg-background border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#6a6a7a]/20 flex items-center justify-center">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Coming Next</h3>
            <p className="text-xs text-muted-foreground">Unlocks after completing the interview</p>
          </div>
        </div>

        {/* Locked features preview */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: BarChart3, label: 'Market Research', color: '#22c55e' },
            { icon: Users, label: 'Competitor Analysis', color: '#4ecdc4' },
            { icon: TrendingUp, label: 'Opportunity Scores', color: '#8b5cf6' },
            { icon: FileText, label: 'Business Reports', color: '#f59e0b' },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-card/50 border border-border opacity-50"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${feature.color}15` }}
              >
                <feature.icon className="w-4 h-4" style={{ color: feature.color }} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

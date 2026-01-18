'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import { IDEA_STATUS_LABELS } from '@forge/shared';
import {
  Lightbulb,
  Sparkles,
  Search,
  CheckCircle2,
  FileText,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

type IdeaStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

// Status configuration with icons and colors
const statusConfig: Record<
  IdeaStatus,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
  }
> = {
  CAPTURED: {
    label: 'Draft',
    icon: <FileText className="w-4 h-4" />,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
    glowColor: '',
  },
  INTERVIEWING: {
    label: 'Forging',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    glowColor: 'shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
  },
  RESEARCHING: {
    label: 'Researching',
    icon: <Search className="w-4 h-4 animate-pulse" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glowColor: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
  },
  COMPLETE: {
    label: 'Ready',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function IdeasPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<IdeaStatus | 'ALL'>('ALL');
  const { data, isLoading, error } = trpc.idea.list.useQuery({});

  if (isLoading) {
    return <LoadingScreen message="Loading your vault..." />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        Failed to load ideas: {error.message}
      </div>
    );
  }

  const allIdeas = data?.items ?? [];
  const ideas = filter === 'ALL' ? allIdeas : allIdeas.filter((idea) => idea.status === filter);

  // Calculate counts for each status
  const statusCounts = {
    ALL: allIdeas.length,
    CAPTURED: allIdeas.filter((i) => i.status === 'CAPTURED').length,
    INTERVIEWING: allIdeas.filter((i) => i.status === 'INTERVIEWING').length,
    RESEARCHING: allIdeas.filter((i) => i.status === 'RESEARCHING').length,
    COMPLETE: allIdeas.filter((i) => i.status === 'COMPLETE').length,
  };

  return (
    <div className="space-y-6 max-w-[1120px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Vault</h1>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {allIdeas.length} idea{allIdeas.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-card/50 border border-border w-fit">
        {(['ALL', 'CAPTURED', 'INTERVIEWING', 'RESEARCHING', 'COMPLETE'] as const).map((status) => {
          const count = statusCounts[status];
          const isActive = filter === status;
          const config = status !== 'ALL' ? statusConfig[status] : null;

          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                ${
                  isActive
                    ? 'bg-primary/20 text-primary shadow-sm'
                    : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {config && <span className={isActive ? 'text-primary' : ''}>{config.icon}</span>}
              <span>{status === 'ALL' ? 'All' : config?.label}</span>
              <span
                className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-primary/30 text-primary' : 'bg-muted text-muted-foreground/60'}
              `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => {
            const status = statusConfig[idea.status as IdeaStatus] || statusConfig.CAPTURED;
            const isResearching = idea.status === 'RESEARCHING';
            const isComplete = idea.status === 'COMPLETE';

            return (
              <Link key={idea.id} href={`/ideas/${idea.id}`} className="group">
                <div
                  className={`
                  relative h-full p-5 rounded-2xl border transition-all duration-300
                  bg-card hover:bg-card/80
                  ${status.borderColor} ${status.glowColor}
                  hover:scale-[1.02] hover:shadow-lg
                  cursor-pointer
                `}
                >
                  {/* Status Badge */}
                  <div
                    className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    ${status.bgColor} ${status.color}
                  `}
                  >
                    {status.icon}
                    <span>{status.label}</span>
                  </div>

                  {/* Title */}
                  <h3 className="mt-3 text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {idea.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-sm text-muted-foreground/70 line-clamp-2">
                    {idea.description || 'No description provided'}
                  </p>

                  {/* Progress bar for researching */}
                  {isResearching && idea.research && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground/60 mb-1.5">
                        <span>Research Progress</span>
                        <span>{idea.research.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                          style={{ width: `${idea.research.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Score preview for complete ideas */}
                  {isComplete && idea.research && (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-muted-foreground/70">Progress:</span>
                        <span className="font-medium text-foreground">
                          {idea.research.progress}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTimeAgo(idea.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: IdeaStatus | 'ALL' }) {
  const router = useRouter();

  const messages: Record<IdeaStatus | 'ALL', { title: string; description: string }> = {
    ALL: {
      title: 'Your vault is empty',
      description: 'Start by capturing your first business idea',
    },
    CAPTURED: {
      title: 'No drafts',
      description: 'Ideas you capture will appear here',
    },
    INTERVIEWING: {
      title: 'No active interviews',
      description: 'Start an interview to forge your idea',
    },
    RESEARCHING: {
      title: 'Nothing researching',
      description: 'Complete an interview to start research',
    },
    COMPLETE: {
      title: 'No completed ideas',
      description: 'Finish research to see your results here',
    },
  };

  const { title, description } = messages[filter];

  return (
    <div className="rounded-2xl bg-card/50 border border-border p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Lightbulb className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground/60 mb-6 max-w-sm mx-auto">{description}</p>
      {filter === 'ALL' && (
        <button
          onClick={() => router.push('/')}
          className="
            inline-flex items-center gap-2 px-5 py-2.5
            bg-primary text-primary-foreground text-sm font-medium
            rounded-full
            shadow-[0_0_20px_hsl(var(--primary)/0.3)]
            hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]
            transition-all duration-300
          "
        >
          <Lightbulb className="w-4 h-4" />
          Capture an Idea
        </button>
      )}
    </div>
  );
}

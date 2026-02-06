'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, FileText } from 'lucide-react';
import { type IdeaStatus, ideaStatusConfig } from '@/lib/idea-status';

function formatRelativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  return `${Math.floor(diffDays / 30)}mo`;
}

export interface IdeaMiniCardProps {
  idea: {
    id: string;
    title: string;
    status: string;
    updatedAt: Date | string;
    _count: { interviews: number; reports: number };
    research: { status: string; progress: number } | null;
  };
}

export function IdeaMiniCard({ idea }: IdeaMiniCardProps) {
  const pathname = usePathname();
  const status = ideaStatusConfig[idea.status as IdeaStatus] || ideaStatusConfig.CAPTURED;
  const isActive = pathname?.startsWith(`/ideas/${idea.id}`);
  const researchProgress =
    idea.status === 'RESEARCHING' && idea.research
      ? idea.research.progress
      : null;

  return (
    <Link
      href={`/ideas/${idea.id}`}
      className={`
        block rounded-lg border p-2.5 transition-all
        ${isActive
          ? 'border-primary/40 bg-primary/10'
          : 'border-border/50 hover:border-border hover:bg-muted/30'
        }
      `}
    >
      {/* Row 1: Status badge + Title */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium leading-none flex-shrink-0 ${status.badgeClass}`}>
          {status.label}
        </span>
        <span className={`text-sm truncate ${isActive ? 'text-primary font-medium' : 'text-foreground'}`}>
          {idea.title}
        </span>
      </div>

      {/* Row 2: Progress bar (RESEARCHING only) + meta */}
      <div className="flex items-center gap-2 mt-1.5">
        {researchProgress !== null ? (
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(researchProgress, 100)}%` }}
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-shrink-0">
          <span>{formatRelativeTime(idea.updatedAt)}</span>
          {idea._count.interviews > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-2.5 h-2.5" />
              {idea._count.interviews}
            </span>
          )}
          {idea._count.reports > 0 && (
            <span className="flex items-center gap-0.5">
              <FileText className="w-2.5 h-2.5" />
              {idea._count.reports}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function IdeaMiniCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 p-2.5 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-10 rounded bg-muted" />
        <div className="h-4 flex-1 rounded bg-muted" />
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="flex-1" />
        <div className="h-3 w-12 rounded bg-muted" />
      </div>
    </div>
  );
}

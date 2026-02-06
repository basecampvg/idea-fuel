'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers } from 'lucide-react';
import { type ProjectStatus, projectStatusConfig, deriveProjectStatus } from '@/lib/project-status';

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

export interface ProjectMiniCardProps {
  project: {
    id: string;
    title: string;
    updatedAt: Date | string;
    ideas: { id: string; status: string; title: string }[];
    _count: { ideas: number; snapshots: number };
  };
}

export function ProjectMiniCard({ project }: ProjectMiniCardProps) {
  const pathname = usePathname();
  const derivedStatus = deriveProjectStatus(project);
  const status = projectStatusConfig[derivedStatus];
  const isActive = pathname?.startsWith(`/projects/${project.id}`);

  return (
    <Link
      href={`/projects/${project.id}`}
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
          {project.title}
        </span>
      </div>

      {/* Row 2: Idea name (if exists) + meta */}
      <div className="flex items-center gap-2 mt-1.5">
        {project.ideas.length > 0 ? (
          <span className="text-[10px] text-muted-foreground truncate flex-1">
            {project.ideas[0].title}
          </span>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-shrink-0">
          <span>{formatRelativeTime(project.updatedAt)}</span>
          {project._count.ideas > 0 && (
            <span className="flex items-center gap-0.5">
              <Layers className="w-2.5 h-2.5" />
              {project._count.ideas}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProjectMiniCardSkeleton() {
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

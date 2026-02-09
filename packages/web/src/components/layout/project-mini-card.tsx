'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, FileText } from 'lucide-react';
import { type ProjectStatus, projectStatusConfig } from '@/lib/project-status';
import { formatRelativeTime } from '@/lib/utils';

export interface ProjectMiniCardProps {
  project: {
    id: string;
    title: string;
    status: string;
    updatedAt: Date | string;
    _count: { interviews: number; reports: number };
    research: { status: string; progress: number } | null;
  };
}

export function ProjectMiniCard({ project }: ProjectMiniCardProps) {
  const pathname = usePathname();
  const status = projectStatusConfig[project.status as ProjectStatus] ?? projectStatusConfig.CAPTURED;
  const isActive = pathname?.startsWith(`/projects/${project.id}`);
  const researchProgress =
    project.status === 'RESEARCHING' && project.research
      ? project.research.progress
      : null;

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
          <span>{formatRelativeTime(project.updatedAt)}</span>
          {project._count.interviews > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-2.5 h-2.5" />
              {project._count.interviews}
            </span>
          )}
          {project._count.reports > 0 && (
            <span className="flex items-center gap-0.5">
              <FileText className="w-2.5 h-2.5" />
              {project._count.reports}
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

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Lightbulb, Pencil, Check, X } from 'lucide-react';
import { type ProjectStatus, projectStatusConfig } from '@/lib/project-status';
import { PROJECT_TITLE_MAX } from '@forge/shared';
import { trpc } from '@/lib/trpc/client';

const statusIcons: Record<ProjectStatus, React.ReactNode> = {
  CAPTURED: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
    </svg>
  ),
  INTERVIEWING: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  RESEARCHING: (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  COMPLETE: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
};

interface ProjectHeaderProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: Date;
  };
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(project.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const status = projectStatusConfig[project.status as ProjectStatus] || projectStatusConfig.CAPTURED;
  const icon = statusIcons[project.status as ProjectStatus] || statusIcons.CAPTURED;

  const utils = trpc.useUtils();
  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate({ id: project.id });
      utils.project.list.invalidate();
    },
  });

  const hasDescription = !!project.description;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === project.title) {
      setEditValue(project.title);
      setIsEditing(false);
      return;
    }
    updateProject.mutate(
      { id: project.id, data: { title: trimmed } },
      { onSettled: () => setIsEditing(false) }
    );
  };

  const handleCancel = () => {
    setEditValue(project.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div>
      <Link
        href="/projects"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Vault
      </Link>

      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => {
                        if (e.target.value.length <= PROJECT_TITLE_MAX) setEditValue(e.target.value);
                      }}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSave}
                      maxLength={PROJECT_TITLE_MAX}
                      className="
                        w-full text-2xl font-semibold text-foreground bg-transparent
                        border-b-2 border-primary/50 focus:border-primary
                        focus:outline-none py-0.5 pr-16
                      "
                      disabled={updateProject.isPending}
                    />
                    <span className={`absolute right-0 top-1/2 -translate-y-1/2 text-xs tabular-nums ${editValue.length >= PROJECT_TITLE_MAX ? 'text-destructive' : 'text-muted-foreground/40'}`}>
                      {editValue.length}/{PROJECT_TITLE_MAX}
                    </span>
                  </div>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleSave}
                    disabled={!editValue.trim() || updateProject.isPending}
                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleCancel}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="group flex items-center gap-2 min-w-0">
                  <h1 className="text-2xl font-semibold text-foreground truncate">{project.title}</h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-lg text-muted-foreground/0 group-hover:text-muted-foreground hover:bg-muted/50 transition-all"
                    title="Edit title"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {/* Status tag */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.badgeClass}`}>
                {icon}
                <span>{status.label}</span>
              </div>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground/60">
              Created {new Date(project.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Idea description callout */}
        {hasDescription && (
          <div className="mt-4 rounded-xl bg-primary/10 border border-primary/20 p-4">
            <div className="flex gap-3">
              <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {project.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

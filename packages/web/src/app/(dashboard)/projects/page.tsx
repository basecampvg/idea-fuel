'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import { getDisplayStatus, type ProjectDisplayStatus } from '@/lib/project-status';
import {
  FolderOpen,
  Sparkles,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  Trash2,
  X,
  Plus,
  Layers,
} from 'lucide-react';

// Status configuration with icons and colors for display statuses
const statusDisplay: Record<
  ProjectDisplayStatus,
  {
    icon: React.ReactNode;
    borderColor: string;
    glowColor: string;
    bgColor: string;
    color: string;
  }
> = {
  Draft: {
    icon: <FileText className="w-4 h-4" />,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
    glowColor: '',
  },
  Active: {
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    glowColor: 'shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
  },
  Complete: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    glowColor: 'shadow-[0_0_20px_hsla(160,84%,44%,0.15)]',
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

export default function ProjectsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<ProjectDisplayStatus | 'ALL'>('ALL');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.project.list.useQuery({});
  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      setDeleteModalOpen(false);
      setProjectToDelete(null);
      setIsDeleting(false);
    },
    onError: () => {
      setIsDeleting(false);
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, project: { id: string; title: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      setIsDeleting(true);
      deleteMutation.mutate({ id: projectToDelete.id });
    }
  };

  const handleNewProject = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return <LoadingScreen message="Loading your vault..." />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        Failed to load projects: {error.message}
      </div>
    );
  }

  const allProjects = (data?.items ?? []).map((p) => ({
    ...p,
    derivedStatus: getDisplayStatus(p.status),
  }));

  const projects = filter === 'ALL' ? allProjects : allProjects.filter((p) => p.derivedStatus === filter);

  const statusCounts = {
    ALL: allProjects.length,
    Draft: allProjects.filter((p) => p.derivedStatus === 'Draft').length,
    Active: allProjects.filter((p) => p.derivedStatus === 'Active').length,
    Complete: allProjects.filter((p) => p.derivedStatus === 'Complete').length,
  };

  return (
    <div className="w-full space-y-6 max-w-[1120px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Vault</h1>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {allProjects.length} project{allProjects.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <button
          onClick={handleNewProject}
          className="
            inline-flex items-center gap-2 px-4 py-2.5
            bg-primary text-primary-foreground text-sm font-medium
            rounded-xl
            shadow-[0_0_20px_hsl(var(--primary)/0.3)]
            hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]
            transition-all duration-300
          "
        >
          <Plus className="w-4 h-4" />
          New Idea
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-card/50 border border-border w-fit">
        {(['ALL', 'Draft', 'Active', 'Complete'] as const).map((status) => {
          const count = statusCounts[status];
          const isActive = filter === status;
          const config = status !== 'ALL' ? statusDisplay[status] : null;

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
              <span>{status === 'ALL' ? 'All' : status}</span>
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

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <EmptyState filter={filter} onNewProject={handleNewProject} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const display = statusDisplay[project.derivedStatus];
            const statusLabel = project.derivedStatus;
            const hasNotes = !!project.notes;

            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="group">
                <div
                  className={`
                  relative h-full p-5 rounded-2xl border transition-all duration-300
                  bg-card hover:bg-card/80
                  ${display.borderColor} ${display.glowColor}
                  hover:scale-[1.02] hover:shadow-lg
                  cursor-pointer
                `}
                >
                  {/* Header Row: Status Badge + Delete */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`
                      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                      ${display.bgColor} ${display.color}
                    `}
                    >
                      {display.icon}
                      <span>{statusLabel}</span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteClick(e, { id: project.id, title: project.title })}
                      className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="mt-3 text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-sm text-muted-foreground/70 line-clamp-2">
                    {project.description || 'No description yet'}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/50">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTimeAgo(project.updatedAt)}</span>
                      </div>
                      {hasNotes && (
                        <div className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Has notes</span>
                        </div>
                      )}
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!isDeleting) {
                setDeleteModalOpen(false);
                setProjectToDelete(null);
              }
            }}
          />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <button
              onClick={() => {
                if (!isDeleting) {
                  setDeleteModalOpen(false);
                  setProjectToDelete(null);
                }
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              disabled={isDeleting}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Project</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Are you sure you want to delete this project?
            </p>
            <p className="text-sm font-medium text-foreground mb-6 line-clamp-2">
              &ldquo;{projectToDelete?.title}&rdquo;
            </p>
            <p className="text-xs text-muted-foreground/60 mb-6">
              This action cannot be undone. The project canvas, idea, interviews, research, and reports will all be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setProjectToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ filter, onNewProject }: { filter: ProjectDisplayStatus | 'ALL'; onNewProject: () => void }) {
  const messages: Record<ProjectDisplayStatus | 'ALL', { title: string; description: string }> = {
    ALL: {
      title: 'Your vault is empty',
      description: 'Start by creating your first project',
    },
    Draft: {
      title: 'No drafts',
      description: 'Projects you create will appear here',
    },
    Active: {
      title: 'No active projects',
      description: 'Start an interview or research to activate a project',
    },
    Complete: {
      title: 'No completed projects',
      description: 'Finish research to see your results here',
    },
  };

  const { title, description } = messages[filter];

  return (
    <div className="rounded-2xl bg-card/50 border border-border p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <FolderOpen className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground/60 mb-6 max-w-sm mx-auto">{description}</p>
      {filter === 'ALL' && (
        <button
          onClick={onNewProject}
          className="
            inline-flex items-center gap-2 px-5 py-2.5
            bg-primary text-primary-foreground text-sm font-medium
            rounded-full
            shadow-[0_0_20px_hsl(var(--primary)/0.3)]
            hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]
            transition-all duration-300
          "
        >
          <Plus className="w-4 h-4" />
          New Idea
        </button>
      )}
    </div>
  );
}

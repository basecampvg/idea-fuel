'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import {
  Plus,
  Clock,
  ArrowRight,
  Trash2,
  X,
  BarChart3,
  FileText,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

type ModelStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

const statusDisplay: Record<
  ModelStatus,
  {
    label: string;
    icon: React.ReactNode;
    borderColor: string;
    glowColor: string;
    bgColor: string;
    color: string;
  }
> = {
  DRAFT: {
    label: 'Draft',
    icon: <FileText className="w-4 h-4" />,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
    glowColor: '',
  },
  ACTIVE: {
    label: 'Active',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    glowColor: 'shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
  },
  ARCHIVED: {
    label: 'Archived',
    icon: <BarChart3 className="w-4 h-4" />,
    color: 'text-muted-foreground/50',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border/50',
    glowColor: '',
  },
};

const knowledgeLevelLabels: Record<string, string> = {
  BEGINNER: 'Beginner',
  STANDARD: 'Standard',
  EXPERT: 'Expert',
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

export default function FinancialsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<ModelStatus | 'ALL'>('ALL');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.financial.list.useQuery({});
  const deleteMutation = trpc.financial.delete.useMutation({
    onSuccess: () => {
      utils.financial.list.invalidate();
      setDeleteModalOpen(false);
      setModelToDelete(null);
      setIsDeleting(false);
    },
    onError: () => {
      setIsDeleting(false);
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, model: { id: string; name: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setModelToDelete(model);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (modelToDelete) {
      setIsDeleting(true);
      deleteMutation.mutate({ id: modelToDelete.id });
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading your financial models..." />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        Failed to load financial models: {error.message}
      </div>
    );
  }

  const allModels = data?.models ?? [];
  const filteredModels = filter === 'ALL'
    ? allModels
    : allModels.filter((m) => m.status === filter);

  const statusCounts = {
    ALL: allModels.length,
    DRAFT: allModels.filter((m) => m.status === 'DRAFT').length,
    ACTIVE: allModels.filter((m) => m.status === 'ACTIVE').length,
  };

  return (
    <div className="w-full space-y-6 max-w-[1120px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financial Models</h1>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {allModels.length} model{allModels.length !== 1 ? 's' : ''} in your portfolio
          </p>
        </div>
        <Link
          href="/financials/new"
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
          New Model
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-card/50 border border-border w-fit">
        {(['ALL', 'DRAFT', 'ACTIVE'] as const).map((status) => {
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
              <span>{status === 'ALL' ? 'All' : statusDisplay[status].label}</span>
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

      {/* Models Grid */}
      {filteredModels.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map((model) => {
            const display = statusDisplay[model.status as ModelStatus] ?? statusDisplay.DRAFT;

            return (
              <Link key={model.id} href={`/financials/${model.id}`} className="group">
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
                      <span>{display.label}</span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteClick(e, { id: model.id, name: model.name })}
                      className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Archive model"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="mt-3 text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {model.name}
                  </h3>

                  {/* Meta Info */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 bg-muted/30 px-2 py-0.5 rounded-md">
                      <TrendingUp className="w-3 h-3" />
                      {model.forecastYears}yr forecast
                    </span>
                    <span className="text-xs text-muted-foreground/70 bg-muted/30 px-2 py-0.5 rounded-md">
                      {knowledgeLevelLabels[model.knowledgeLevel] ?? model.knowledgeLevel}
                    </span>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTimeAgo(model.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Open</span>
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
                setModelToDelete(null);
              }
            }}
          />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <button
              onClick={() => {
                if (!isDeleting) {
                  setDeleteModalOpen(false);
                  setModelToDelete(null);
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
            <h3 className="text-lg font-semibold text-foreground mb-2">Archive Model</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Are you sure you want to archive this financial model?
            </p>
            <p className="text-sm font-medium text-foreground mb-6 line-clamp-2">
              &ldquo;{modelToDelete?.name}&rdquo;
            </p>
            <p className="text-xs text-muted-foreground/60 mb-6">
              The model will be archived and hidden from your list. All scenarios and snapshots will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setModelToDelete(null);
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
                {isDeleting ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: ModelStatus | 'ALL' }) {
  const messages: Record<ModelStatus | 'ALL', { title: string; description: string }> = {
    ALL: {
      title: 'No financial models yet',
      description: 'Create your first model to start forecasting revenue, costs, and cash flow',
    },
    DRAFT: {
      title: 'No draft models',
      description: 'Models you create will appear here as drafts',
    },
    ACTIVE: {
      title: 'No active models',
      description: 'Finalize a draft model to make it active',
    },
    ARCHIVED: {
      title: 'No archived models',
      description: 'Archived models will appear here',
    },
  };

  const { title, description } = messages[filter];

  return (
    <div className="rounded-2xl bg-card/50 border border-border p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground/60 mb-6 max-w-sm mx-auto">{description}</p>
      {filter === 'ALL' && (
        <Link
          href="/financials/new"
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
          New Model
        </Link>
      )}
    </div>
  );
}

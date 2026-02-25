'use client';

import { use, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/spinner';
import { Camera, Plus, RotateCcw, GitCompare, Clock, AlertTriangle, X } from 'lucide-react';

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SnapshotsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: modelId } = use(params);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);

  const utils = trpc.useUtils();

  const { data: snapshots, isLoading } = trpc.snapshot.list.useQuery({ modelId });

  const createMutation = trpc.snapshot.create.useMutation({
    onSuccess: () => {
      utils.snapshot.list.invalidate({ modelId });
      setShowCreateForm(false);
      setNewName('');
    },
  });

  const restoreMutation = trpc.snapshot.restore.useMutation({
    onSuccess: () => {
      utils.snapshot.list.invalidate({ modelId });
      utils.financial.get.invalidate({ id: modelId });
      setRestoringId(null);
      setConfirmRestoreId(null);
    },
    onError: () => {
      setRestoringId(null);
      setConfirmRestoreId(null);
    },
  });

  const { data: comparison } = trpc.snapshot.compare.useQuery(
    { snapshotId1: compareIds?.[0] ?? '', snapshotId2: compareIds?.[1] ?? '' },
    { enabled: !!compareIds },
  );

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    createMutation.mutate({ modelId, name: newName.trim() });
  }, [modelId, newName, createMutation]);

  const handleRestore = useCallback((id: string) => {
    setRestoringId(id);
    restoreMutation.mutate({ snapshotId: id });
  }, [restoreMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const snapshotList = snapshots ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Snapshots</h2>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {snapshotList.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Snapshot
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">New Snapshot</span>
            <button onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Snapshot name (e.g., Before pricing change)"
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Restore Confirmation */}
      {confirmRestoreId && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Restore this snapshot?</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              The current model state will be automatically saved before restoring.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => handleRestore(confirmRestoreId)}
                disabled={restoreMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {restoreMutation.isPending ? 'Restoring...' : 'Yes, restore'}
              </button>
              <button
                onClick={() => setConfirmRestoreId(null)}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot List */}
      {snapshotList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/50 p-12 text-center">
          <Camera className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No snapshots yet</h3>
          <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
            Create a snapshot to save the current state of your model. You can restore it later.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {snapshotList.map((snapshot) => (
            <div
              key={snapshot.id}
              className={`
                group flex items-center gap-4 px-4 py-3 rounded-xl border transition-all
                ${restoringId === snapshot.id ? 'opacity-50' : ''}
                ${snapshot.createdByAction === 'AUTO_SAVE'
                  ? 'border-border/50 bg-card/50'
                  : 'border-border bg-card hover:border-border/80'
                }
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {snapshot.name}
                  </span>
                  {snapshot.createdByAction === 'AUTO_SAVE' && (
                    <span className="text-[10px] text-muted-foreground/40 bg-muted/30 px-1.5 py-0.5 rounded">
                      auto-save
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/40 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatDate(snapshot.createdAt)}
                </span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    if (!compareIds) {
                      setCompareIds([snapshot.id, '']);
                    } else if (compareIds[1] === '') {
                      setCompareIds([compareIds[0], snapshot.id]);
                    } else {
                      setCompareIds([snapshot.id, '']);
                    }
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-all"
                  title="Compare"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirmRestoreId(snapshot.id)}
                  disabled={restoringId !== null}
                  className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-amber-400 hover:bg-amber-500/5 transition-all"
                  title="Restore"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compare View */}
      {compareIds && compareIds[0] && compareIds[1] && comparison && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Comparing: {comparison.snapshot1.name} vs {comparison.snapshot2.name}
              </span>
            </div>
            <button
              onClick={() => setCompareIds(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 text-sm text-muted-foreground/60">
            <p>Snapshot comparison shows the full assumption data diff between two points in time.</p>
            <p className="mt-2 text-xs">
              {comparison.snapshot1.name}: {formatDate(comparison.snapshot1.createdAt)}
            </p>
            <p className="text-xs">
              {comparison.snapshot2.name}: {formatDate(comparison.snapshot2.createdAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

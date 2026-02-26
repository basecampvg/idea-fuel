'use client';

import { use, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/spinner';
import { ScenarioCard } from './components/scenario-card';
import { ScenarioComparison } from './components/scenario-comparison';
import { GitCompare, Plus, BarChart3, X } from 'lucide-react';

type ViewMode = 'list' | 'compare';

export default function ScenariosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: modelId } = use(params);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [cloneFromId, setCloneFromId] = useState<string | undefined>();
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: model } = trpc.financial.get.useQuery({ id: modelId });
  const { data: scenarioList, isLoading } = trpc.scenario.list.useQuery({ modelId });

  const createMutation = trpc.scenario.create.useMutation({
    onSuccess: () => {
      utils.scenario.list.invalidate({ modelId });
      utils.financial.get.invalidate({ id: modelId });
      setShowAddForm(false);
      setNewName('');
      setCloneFromId(undefined);
    },
  });

  const deleteMutation = trpc.scenario.delete.useMutation({
    onSuccess: () => {
      utils.scenario.list.invalidate({ modelId });
      utils.financial.get.invalidate({ id: modelId });
      setDeletingId(null);
    },
    onError: () => setDeletingId(null),
  });

  const { data: comparison } = trpc.scenario.compare.useQuery(
    { scenarioIds: selectedForCompare },
    { enabled: viewMode === 'compare' && selectedForCompare.length >= 2 },
  );

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    createMutation.mutate({ modelId, name: newName.trim(), cloneFromScenarioId: cloneFromId });
  }, [modelId, newName, cloneFromId, createMutation]);

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id);
    deleteMutation.mutate({ id });
  }, [deleteMutation]);

  const toggleCompareSelection = useCallback((id: string) => {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id].slice(0, 5),
    );
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const scenarios = scenarioList ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Scenarios</h2>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {scenarios.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-muted/30 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              List
            </button>
            <button
              onClick={() => {
                setViewMode('compare');
                if (selectedForCompare.length === 0 && scenarios.length >= 2) {
                  setSelectedForCompare(scenarios.slice(0, 2).map((s) => s.id));
                }
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'compare'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Compare
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Scenario
          </button>
        </div>
      </div>

      {/* Add Scenario Form */}
      {showAddForm && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">New Scenario</span>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Scenario name (e.g., Optimistic Case)"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex items-center gap-3">
            <select
              value={cloneFromId ?? ''}
              onChange={(e) => setCloneFromId(e.target.value || undefined)}
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="">Start from scratch</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  Clone from: {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onDelete={handleDelete}
              isDeleting={deletingId === scenario.id}
            />
          ))}
        </div>
      )}

      {/* Compare View */}
      {viewMode === 'compare' && (
        <div className="space-y-3">
          {/* Scenario selector chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground/60">Select scenarios:</span>
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleCompareSelection(s.id)}
                className={`
                  px-3 py-1 text-xs font-medium rounded-full border transition-all
                  ${selectedForCompare.includes(s.id)
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-border/80'
                  }
                `}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Comparison table */}
          {selectedForCompare.length >= 2 ? (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {comparison ? (
                <ScenarioComparison
                  scenarioIds={selectedForCompare}
                  comparison={comparison.comparison}
                />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="md" />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
              <BarChart3 className="w-6 h-6 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground/60">Select at least 2 scenarios to compare</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

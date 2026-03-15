'use client';

import { use, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { AssumptionGrid } from './components/assumption-grid';
import { AssumptionFilters } from './components/assumption-filters';
import { AssumptionDetailPanel } from './components/assumption-detail-panel';
import { DependencyGraph } from './components/dependency-graph';
import { ASSUMPTION_IMPACT_MAP } from './components/impact-map';
import { Settings2, Loader2, GitBranch } from 'lucide-react';
import type { AssumptionCategory, AssumptionConfidence } from '@forge/shared';

export default function FinancialAssumptionsPage({
  params,
}: {
  params: Promise<{ id: string; modelId: string }>;
}) {
  const { id: projectId, modelId } = use(params);

  // State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<AssumptionCategory>>(new Set());
  const [selectedConfidence, setSelectedConfidence] = useState<AssumptionConfidence | null>(null);
  const [cascadedKeys, setCascadedKeys] = useState<Set<string>>(new Set());
  const [showGraph, setShowGraph] = useState(false);
  const cascadeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const utils = trpc.useUtils();

  // Seed defaults on first visit (idempotent)
  const seedMutation = trpc.assumption.seedDefaults.useMutation({
    onSuccess: () => {
      utils.assumption.list.invalidate({ projectId });
    },
  });

  // Sync calculated assumptions from template (repairs existing models)
  const syncMutation = trpc.assumption.syncFromTemplate.useMutation({
    onSuccess: (data) => {
      if (data.synced && (data.added > 0 || data.updated > 0)) {
        utils.assumption.list.invalidate({ projectId });
      }
    },
  });

  // Fetch assumptions
  const {
    data: assumptions,
    isLoading,
    error,
  } = trpc.assumption.list.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  // Auto-seed on first visit
  useEffect(() => {
    if (assumptions && assumptions.length === 0 && !seedMutation.isPending && !seedMutation.isSuccess) {
      seedMutation.mutate({ projectId });
    }
  }, [assumptions, projectId, seedMutation]);

  // Auto-sync: add any missing assumptions from the template
  // Runs once per page load — the mutation is idempotent and returns early if nothing to do
  useEffect(() => {
    if (
      assumptions &&
      assumptions.length > 0 &&
      !syncMutation.isPending &&
      !syncMutation.isSuccess
    ) {
      syncMutation.mutate({ projectId, modelId });
    }
  }, [assumptions, projectId, modelId, syncMutation]);

  // Auto-select the first card to hint that cards are editable
  useEffect(() => {
    if (assumptions && assumptions.length > 0 && selectedId === null) {
      setSelectedId(assumptions[0].id);
    }
  }, [assumptions, selectedId]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<AssumptionCategory, number> = {
      PRICING: 0, ACQUISITION: 0, RETENTION: 0, MARKET: 0,
      COSTS: 0, FUNDING: 0, TIMELINE: 0,
    };
    if (assumptions) {
      for (const a of assumptions) {
        counts[a.category as AssumptionCategory]++;
      }
    }
    return counts;
  }, [assumptions]);

  // Selected assumption
  const selectedAssumption = useMemo(() => {
    if (!selectedId || !assumptions) return null;
    return assumptions.find((a) => a.id === selectedId) ?? null;
  }, [selectedId, assumptions]);

  // Handlers
  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleCategoryToggle = useCallback((category: AssumptionCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleConfidenceChange = useCallback((confidence: AssumptionConfidence | null) => {
    setSelectedConfidence(confidence);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategories(new Set());
    setSelectedConfidence(null);
  }, []);

  const handleCascadeComplete = useCallback((keys: string[]) => {
    setCascadedKeys(new Set(keys));
    // Clear cascade animation after 1.5s
    if (cascadeTimerRef.current) clearTimeout(cascadeTimerRef.current);
    cascadeTimerRef.current = setTimeout(() => setCascadedKeys(new Set()), 1500);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedId(null);
  }, []);

  // Sub-assumption mutations
  const createSubMutation = trpc.assumption.createSubAssumption.useMutation({
    onSuccess: () => {
      utils.assumption.list.invalidate({ projectId });
    },
  });

  const deleteSubMutation = trpc.assumption.deleteSubAssumption.useMutation({
    onSuccess: () => {
      utils.assumption.list.invalidate({ projectId });
    },
  });

  const updateMutation = trpc.assumption.update.useMutation({
    onSuccess: () => {
      utils.assumption.list.invalidate({ projectId });
    },
  });

  const handleAddSub = useCallback((parentId: string, data: { name: string; key: string; value: string; valueType: string }) => {
    createSubMutation.mutate({
      projectId,
      parentId,
      name: data.name,
      key: data.key,
      value: data.value,
      valueType: data.valueType as 'NUMBER',
    });
  }, [projectId, createSubMutation]);

  const handleDeleteSub = useCallback((assumptionId: string) => {
    deleteSubMutation.mutate({ projectId, assumptionId });
  }, [projectId, deleteSubMutation]);

  const handleUpdateSubValue = useCallback((assumptionId: string, value: string) => {
    updateMutation.mutate({ id: assumptionId, projectId, value });
  }, [projectId, updateMutation]);

  // Loading state
  if (isLoading || seedMutation.isPending || syncMutation.isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {seedMutation.isPending ? 'Setting up assumptions...'
              : syncMutation.isPending ? 'Syncing calculated fields...'
              : 'Loading assumptions...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  const allEmpty = assumptions?.every((a) => a.value === null);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Assumptions</h2>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {assumptions?.length ?? 0}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowGraph((prev) => !prev)}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
            transition-colors border
            ${showGraph
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }
          `}
        >
          <GitBranch className="w-3.5 h-3.5" />
          Dep Graph
        </button>
      </div>

      {/* Onboarding hint */}
      {allEmpty && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground/80">
            These are the key assumptions behind your business model.
            Start by setting your <strong>Unit Price</strong> — everything else flows from there.
          </p>
        </div>
      )}

      {/* Dependency graph (when toggled) */}
      {showGraph && assumptions && (
        <DependencyGraph
          assumptions={(assumptions ?? []).map((a) => ({
            key: a.key,
            name: a.name,
            category: a.category as AssumptionCategory,
            confidence: (a.effectiveConfidence ?? a.confidence) as AssumptionConfidence,
            dependsOn: a.dependsOn as string[],
            value: a.value,
          }))}
          impactMap={ASSUMPTION_IMPACT_MAP}
          onClose={() => setShowGraph(false)}
        />
      )}

      {/* Filters */}
      <AssumptionFilters
        selectedCategories={selectedCategories}
        selectedConfidence={selectedConfidence}
        onCategoryToggle={handleCategoryToggle}
        onConfidenceChange={handleConfidenceChange}
        onClearAll={handleClearFilters}
        counts={categoryCounts}
      />

      {/* Grid + Detail Panel layout */}
      <div className="flex gap-4 items-start">
        {/* Card grid */}
        <div className={`flex-1 min-w-0 ${selectedId ? 'max-w-[calc(100%-320px)]' : ''}`}>
          <AssumptionGrid
            assumptions={(assumptions ?? []) as Parameters<typeof AssumptionGrid>[0]['assumptions']}
            selectedId={selectedId}
            cascadedKeys={cascadedKeys}
            selectedCategories={selectedCategories}
            selectedConfidence={selectedConfidence}
            projectId={projectId}
            onSelect={handleSelect}
            onAddSub={handleAddSub}
            onDeleteSub={handleDeleteSub}
            onUpdateSubValue={handleUpdateSubValue}
          />
        </div>

        {/* Detail panel — mt-7 aligns with card grid below category headers */}
        {selectedId && (
          <div className="w-[320px] flex-shrink-0 sticky top-28 mt-7 rounded-xl border border-border bg-card max-h-[calc(100vh-140px)] overflow-hidden">
            <AssumptionDetailPanel
              assumption={selectedAssumption as Parameters<typeof AssumptionDetailPanel>[0]['assumption']}
              allAssumptions={(assumptions ?? []) as Parameters<typeof AssumptionDetailPanel>[0]['allAssumptions']}
              onClose={handleClosePanel}
              onCascadeComplete={handleCascadeComplete}
            />
          </div>
        )}
      </div>
    </div>
  );
}

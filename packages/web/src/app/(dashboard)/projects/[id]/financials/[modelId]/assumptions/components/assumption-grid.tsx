'use client';

import { useMemo, memo } from 'react';
import { AssumptionCard } from './assumption-card';
import type { AssumptionCategory, AssumptionConfidence } from '@forge/shared';

interface AssumptionWithMeta {
  id: string;
  name: string;
  key: string;
  value: string | null;
  unit: string | null;
  confidence: AssumptionConfidence;
  effectiveConfidence?: AssumptionConfidence;
  category: AssumptionCategory;
  formula: string | null;
  staleness?: { isStale: boolean };
  parentId?: string | null;
  aggregationMode?: string | null;
}

interface AssumptionGridProps {
  assumptions: AssumptionWithMeta[];
  selectedId: string | null;
  cascadedKeys: Set<string>;
  selectedCategories: Set<AssumptionCategory>;
  selectedConfidence: AssumptionConfidence | null;
  projectId?: string;
  onSelect: (id: string) => void;
  onAddSub?: (parentId: string, data: { name: string; key: string; value: string; valueType: string }) => void;
  onDeleteSub?: (id: string) => void;
  onUpdateSubValue?: (id: string, value: string) => void;
}

const CATEGORY_ORDER: AssumptionCategory[] = [
  'PRICING', 'ACQUISITION', 'RETENTION', 'MARKET', 'COSTS', 'FUNDING', 'TIMELINE',
];

const CATEGORY_LABELS: Record<AssumptionCategory, string> = {
  PRICING: 'Pricing',
  ACQUISITION: 'Acquisition',
  RETENTION: 'Retention',
  MARKET: 'Market',
  COSTS: 'Costs',
  FUNDING: 'Funding',
  TIMELINE: 'Timeline',
};

export const AssumptionGrid = memo(function AssumptionGrid({
  assumptions,
  selectedId,
  cascadedKeys,
  selectedCategories,
  selectedConfidence,
  projectId,
  onSelect,
  onAddSub,
  onDeleteSub,
  onUpdateSubValue,
}: AssumptionGridProps) {
  // Build parent → children map
  const childrenMap = useMemo(() => {
    const map = new Map<string, AssumptionWithMeta[]>();
    for (const a of assumptions) {
      if (a.parentId) {
        const list = map.get(a.parentId) ?? [];
        list.push(a);
        map.set(a.parentId, list);
      }
    }
    return map;
  }, [assumptions]);

  const filtered = useMemo(() => {
    // Only show top-level assumptions (no parentId)
    let result = assumptions.filter((a) => !a.parentId);
    if (selectedCategories.size > 0) {
      result = result.filter((a) => selectedCategories.has(a.category));
    }
    if (selectedConfidence) {
      result = result.filter((a) => {
        const effective = a.effectiveConfidence ?? a.confidence;
        return effective === selectedConfidence;
      });
    }
    return result;
  }, [assumptions, selectedCategories, selectedConfidence]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = new Map<AssumptionCategory, AssumptionWithMeta[]>();
    for (const a of filtered) {
      const list = groups.get(a.category) ?? [];
      list.push(a);
      groups.set(a.category, list);
    }
    return CATEGORY_ORDER
      .filter((cat) => groups.has(cat))
      .map((cat) => ({ category: cat, items: groups.get(cat)! }));
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No assumptions match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ category, items }) => (
        <div key={category}>
          <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {CATEGORY_LABELS[category]}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((a) => (
              <AssumptionCard
                key={a.id}
                id={a.id}
                key_={a.key}
                name={a.name}
                value={a.value}
                unit={a.unit}
                confidence={a.confidence}
                effectiveConfidence={a.effectiveConfidence}
                category={a.category}
                formula={a.formula}
                isStale={a.staleness?.isStale}
                isSelected={selectedId === a.id}
                cascadePulse={cascadedKeys.has(a.key)}
                children_={childrenMap.get(a.id)?.map((c) => ({
                  id: c.id,
                  name: c.name,
                  key: c.key,
                  value: c.value,
                  unit: c.unit,
                  formula: c.formula,
                }))}
                aggregationMode={a.aggregationMode}
                projectId={projectId}
                onClick={onSelect}
                onAddSub={onAddSub}
                onDeleteSub={onDeleteSub}
                onUpdateSubValue={onUpdateSubValue}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

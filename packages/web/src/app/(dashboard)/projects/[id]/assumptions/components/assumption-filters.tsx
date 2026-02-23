'use client';

import { memo } from 'react';
import type { AssumptionCategory, AssumptionConfidence } from '@forge/shared';

interface AssumptionFiltersProps {
  selectedCategories: Set<AssumptionCategory>;
  selectedConfidence: AssumptionConfidence | null;
  onCategoryToggle: (category: AssumptionCategory) => void;
  onConfidenceChange: (confidence: AssumptionConfidence | null) => void;
  onClearAll: () => void;
  counts: Record<AssumptionCategory, number>;
}

const CATEGORIES: { value: AssumptionCategory; label: string }[] = [
  { value: 'PRICING', label: 'Pricing' },
  { value: 'ACQUISITION', label: 'Acquisition' },
  { value: 'RETENTION', label: 'Retention' },
  { value: 'MARKET', label: 'Market' },
  { value: 'COSTS', label: 'Costs' },
  { value: 'FUNDING', label: 'Funding' },
  { value: 'TIMELINE', label: 'Timeline' },
];

const CONFIDENCE_OPTIONS: { value: AssumptionConfidence; label: string; color: string }[] = [
  { value: 'USER', label: 'User', color: 'bg-primary' },
  { value: 'RESEARCHED', label: 'Researched', color: 'bg-green-500' },
  { value: 'AI_ESTIMATE', label: 'AI', color: 'bg-amber-500' },
  { value: 'CALCULATED', label: 'Calc', color: 'bg-violet-400' },
];

export const AssumptionFilters = memo(function AssumptionFilters({
  selectedCategories,
  selectedConfidence,
  onCategoryToggle,
  onConfidenceChange,
  onClearAll,
  counts,
}: AssumptionFiltersProps) {
  const hasFilters = selectedCategories.size > 0 || selectedConfidence !== null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Category pills */}
      <div className="flex items-center gap-1.5">
        {CATEGORIES.map(({ value, label }) => {
          const active = selectedCategories.has(value);
          const count = counts[value] ?? 0;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onCategoryToggle(value)}
              className={`
                inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium
                transition-colors duration-100
                ${active
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {label}
              <span className={`text-[10px] ${active ? 'text-foreground/60' : 'text-muted-foreground/60'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-border" />

      {/* Confidence filter */}
      <div className="flex items-center gap-1">
        {CONFIDENCE_OPTIONS.map(({ value, label, color }) => {
          const active = selectedConfidence === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onConfidenceChange(active ? null : value)}
              className={`
                inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                transition-colors duration-100
                ${active
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Clear all */}
      {hasFilters && (
        <>
          <div className="w-px h-4 bg-border" />
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </>
      )}
    </div>
  );
});

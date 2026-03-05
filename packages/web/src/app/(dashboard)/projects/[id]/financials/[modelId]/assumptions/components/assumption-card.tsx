'use client';

import { memo } from 'react';
import type { AssumptionConfidence, AssumptionCategory } from '@forge/shared';

interface AssumptionCardProps {
  id: string;
  name: string;
  key_: string;
  value: string | null;
  unit: string | null;
  confidence: AssumptionConfidence;
  effectiveConfidence?: AssumptionConfidence;
  category: AssumptionCategory;
  formula: string | null;
  isStale?: boolean;
  isSelected?: boolean;
  cascadePulse?: boolean;
  onClick: (id: string) => void;
}

const CONFIDENCE_BORDER_COLORS: Record<AssumptionConfidence, string> = {
  USER: 'border-l-primary',
  RESEARCHED: 'border-l-green-500',
  AI_ESTIMATE: 'border-l-amber-500',
  CALCULATED: 'border-l-violet-400',
};

const CONFIDENCE_LABELS: Record<AssumptionConfidence, string> = {
  USER: 'User-set',
  RESEARCHED: 'Researched',
  AI_ESTIMATE: 'AI Estimate',
  CALCULATED: 'Calculated',
};

const CATEGORY_LABELS: Record<AssumptionCategory, string> = {
  PRICING: 'Pricing',
  ACQUISITION: 'Acquisition',
  RETENTION: 'Retention',
  MARKET: 'Market',
  COSTS: 'Costs',
  FUNDING: 'Funding',
  TIMELINE: 'Timeline',
};

function formatValue(value: string | null, unit: string | null): string {
  if (value === null || value === '') return '\u2014';
  const num = Number(value);
  if (Number.isNaN(num)) return value;

  if (unit === '$') {
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toLocaleString()}`;
  }
  if (unit === '%') return `${num}%`;
  if (unit === 'x') return `${num}x`;
  if (unit) return `${num} ${unit}`;
  return num.toLocaleString();
}

export const AssumptionCard = memo(function AssumptionCard({
  id,
  name,
  value,
  unit,
  confidence,
  effectiveConfidence,
  category,
  formula,
  isStale,
  isSelected,
  cascadePulse,
  onClick,
}: AssumptionCardProps) {
  const displayConfidence = effectiveConfidence ?? confidence;
  const borderColor = CONFIDENCE_BORDER_COLORS[displayConfidence];
  const formatted = formatValue(value, unit);
  const isEmpty = value === null || value === '';

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`
        group relative w-full text-left rounded-lg border border-border bg-card
        transition-all duration-150 ease-out
        hover:border-foreground/20 hover:shadow-sm
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        border-l-4
        ${isSelected ? 'border-l-orange-500 ring-2 ring-orange-500/20 border-foreground/30 shadow-sm' : borderColor}
        ${isStale ? 'border-dashed border-amber-500/50 bg-amber-500/[0.03]' : ''}
        ${cascadePulse ? 'animate-cascade-pulse' : ''}
      `}
      style={{ minHeight: 100 }}
    >
      <div className="px-4 py-3 flex flex-col justify-between h-full min-h-[100px]">
        {/* Top: Category + Formula indicator + Edit hint */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground font-medium">
              {CATEGORY_LABELS[category]}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {formula && (
              <span className="text-[10px] text-violet-400/70 font-mono">f(x)</span>
            )}
            <span className={`text-[10px] font-medium transition-colors ${
              isSelected ? 'text-orange-500' : 'text-muted-foreground/30 group-hover:text-muted-foreground/60'
            }`}>
              Edit
            </span>
          </div>
        </div>

        {/* Middle: Value */}
        <div className={`font-mono text-lg font-semibold leading-tight ${
          isEmpty ? 'text-muted-foreground/40 italic' : 'text-foreground'
        }`}>
          {formatted}
        </div>

        {/* Bottom: Name + Confidence */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground truncate font-medium">
            {name}
          </span>
          <span className={`text-[10px] flex-shrink-0 font-medium ${
            displayConfidence === 'USER' ? 'text-primary' :
            displayConfidence === 'RESEARCHED' ? 'text-green-500' :
            displayConfidence === 'AI_ESTIMATE' ? 'text-amber-500' :
            'text-violet-400'
          }`}>
            {CONFIDENCE_LABELS[displayConfidence]}
          </span>
        </div>
      </div>

      {/* Stale indicator */}
      {isStale && (
        <div className="absolute top-2 right-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block" title="Stale data" />
        </div>
      )}
    </button>
  );
});

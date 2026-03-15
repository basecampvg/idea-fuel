'use client';

import { memo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { SubAssumptionRow } from './sub-assumption-row';
import { AddSubAssumptionForm } from './add-sub-assumption-form';
import type { AssumptionConfidence, AssumptionCategory } from '@forge/shared';

interface SubAssumption {
  id: string;
  name: string;
  key: string;
  value: string | null;
  unit: string | null;
  formula: string | null;
}

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
  children_?: SubAssumption[];
  aggregationMode?: string | null;
  projectId?: string;
  onClick: (id: string) => void;
  onAddSub?: (parentId: string, data: { name: string; key: string; value: string; valueType: string }) => void;
  onDeleteSub?: (id: string) => void;
  onUpdateSubValue?: (id: string, value: string) => void;
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
  children_,
  aggregationMode,
  projectId,
  onClick,
  onAddSub,
  onDeleteSub,
  onUpdateSubValue,
}: AssumptionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const hasChildren = children_ && children_.length > 0;
  const displayConfidence = effectiveConfidence ?? confidence;
  const borderColor = CONFIDENCE_BORDER_COLORS[displayConfidence];
  const formatted = formatValue(value, unit);
  const isEmpty = value === null || value === '';

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleAddSub = useCallback((data: { name: string; key: string; value: string; valueType: string }) => {
    onAddSub?.(id, data);
    setShowAddForm(false);
  }, [id, onAddSub]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(true);
    setShowAddForm(true);
  }, []);

  return (
    <div
      className={`
        group relative w-full text-left rounded-lg border border-border bg-card
        transition-all duration-150 ease-out
        hover:border-foreground/20 hover:shadow-sm
        border-l-4
        ${isSelected ? 'border-l-orange-500 ring-2 ring-orange-500/20 border-foreground/30 shadow-sm' : borderColor}
        ${isStale ? 'border-dashed border-amber-500/50 bg-amber-500/[0.03]' : ''}
        ${cascadePulse ? 'animate-cascade-pulse' : ''}
      `}
    >
      {/* Main card area — clickable */}
      <button
        type="button"
        onClick={() => onClick(id)}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        style={{ minHeight: 100 }}
      >
        <div className="px-4 py-3 flex flex-col justify-between h-full min-h-[100px]">
          {/* Top: Category + Formula indicator + Expand toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {/* Expand/collapse toggle for cards with children */}
              {(hasChildren || onAddSub) && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleToggleExpand}
                  onKeyDown={(e) => e.key === 'Enter' && handleToggleExpand(e as unknown as React.MouseEvent)}
                  className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
              )}
              {!hasChildren && !onAddSub && (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
              )}
              <span className="text-[11px] text-muted-foreground font-medium">
                {CATEGORY_LABELS[category]}
              </span>
              {hasChildren && (
                <span className="text-[10px] text-muted-foreground/50 font-medium">
                  ({children_.length} {aggregationMode ?? 'SUM'})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {formula && (
                <span className="text-[10px] text-violet-400/70 font-mono">f(x)</span>
              )}
              {onAddSub && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleAddClick}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddClick(e as unknown as React.MouseEvent)}
                  className="text-[10px] text-muted-foreground/30 hover:text-primary transition-colors cursor-pointer"
                  title="Add sub-assumption"
                >
                  <Plus className="w-3.5 h-3.5" />
                </span>
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
      </button>

      {/* Expanded sub-rows */}
      {isExpanded && (
        <div className="border-t border-border/50 px-2 py-1.5 space-y-0.5">
          {children_?.map((child) => (
            <SubAssumptionRow
              key={child.id}
              id={child.id}
              name={child.name}
              key_={child.key}
              value={child.value}
              unit={child.unit}
              formula={child.formula}
              onDelete={(childId) => onDeleteSub?.(childId)}
              onValueChange={(childId, val) => onUpdateSubValue?.(childId, val)}
            />
          ))}

          {/* Add sub-assumption form */}
          {showAddForm ? (
            <AddSubAssumptionForm
              parentId={id}
              projectId={projectId ?? ''}
              onAdd={handleAddSub}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[11px] text-muted-foreground/50 hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add row
            </button>
          )}
        </div>
      )}

      {/* Stale indicator */}
      {isStale && (
        <div className="absolute top-2 right-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block" title="Stale data" />
        </div>
      )}
    </div>
  );
});

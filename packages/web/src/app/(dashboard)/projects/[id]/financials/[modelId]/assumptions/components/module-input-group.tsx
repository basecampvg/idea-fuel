'use client';

import { InputCard } from './input-card';
import { Blocks } from 'lucide-react';

interface AssumptionInput {
  id: string;
  name: string;
  key: string;
  value: string | null;
  unit: string | null;
  formula: string | null;
  confidence?: string;
  parentId?: string | null;
  aggregationMode?: string | null;
}

interface AvailableAssumption {
  key: string;
  name: string;
  value: string | null;
  unit: string | null;
}

interface ModuleInputGroupProps {
  title: string;
  outputSummary?: string;
  icon?: string;
  assumptions: AssumptionInput[];
  allAssumptions?: AvailableAssumption[];
  expandedCardId: string | null;
  onToggleExpand: (id: string) => void;
  onValueChange: (id: string, value: string) => void;
  onFormulaChange?: (id: string, formula: string | null) => void;
  onAddSub?: (parentId: string, data: { name: string; key: string; value: string }) => void;
  onDeleteSub?: (id: string) => void;
  onSubValueChange?: (id: string, value: string) => void;
}

export function ModuleInputGroup({
  title,
  outputSummary,
  icon,
  assumptions,
  allAssumptions,
  expandedCardId,
  onToggleExpand,
  onValueChange,
  onFormulaChange,
  onAddSub,
  onDeleteSub,
  onSubValueChange,
}: ModuleInputGroupProps) {
  // Separate top-level assumptions from children
  const topLevel = assumptions.filter((a) => !a.parentId);
  const childrenMap = new Map<string, AssumptionInput[]>();
  for (const a of assumptions) {
    if (a.parentId) {
      const list = childrenMap.get(a.parentId) ?? [];
      list.push(a);
      childrenMap.set(a.parentId, list);
    }
  }

  if (topLevel.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
      {/* Module header */}
      <div className="px-4 py-3 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon ? (
            <span className="text-base">{icon}</span>
          ) : (
            <Blocks className="w-4 h-4 text-muted-foreground/50" />
          )}
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        {outputSummary && (
          <span className="text-[11px] text-muted-foreground/60 font-mono">
            {outputSummary}
          </span>
        )}
      </div>

      {/* Input cards grid */}
      <div className="p-3 flex flex-col gap-2">
        {topLevel.map((a) => (
          <InputCard
            key={a.id}
            id={a.id}
            key_={a.key}
            name={a.name}
            value={a.value}
            unit={a.unit}
            formula={a.formula}
            confidence={a.confidence as 'USER' | 'RESEARCHED' | 'AI_ESTIMATE' | 'CALCULATED' | undefined}
            dependsOn={(a as { dependsOn?: string[] }).dependsOn}
            children_={childrenMap.get(a.id)?.map((c) => ({
              id: c.id,
              name: c.name,
              key: c.key,
              value: c.value,
              unit: c.unit,
              formula: c.formula,
            }))}
            aggregationMode={a.aggregationMode}
            allAssumptions={allAssumptions}
            isExpanded={expandedCardId === a.id}
            onToggleExpand={onToggleExpand}
            onValueChange={onValueChange}
            onFormulaChange={onFormulaChange}
            onAddSub={onAddSub}
            onDeleteSub={onDeleteSub}
            onSubValueChange={onSubValueChange}
          />
        ))}
      </div>
    </div>
  );
}

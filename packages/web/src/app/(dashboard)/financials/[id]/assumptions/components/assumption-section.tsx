'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AssumptionRow } from './assumption-row';

interface Assumption {
  id: string;
  key: string;
  name: string;
  value: string | null;
  numericValue?: string | null;
  valueType: string;
  unit: string | null;
  confidence: string;
  formula: string | null;
  category: string;
  [key: string]: unknown;
}

interface AssumptionSectionProps {
  title: string;
  assumptions: Assumption[];
  onValueChange: (id: string, value: string) => void;
  updatingIds: Set<string>;
  defaultOpen?: boolean;
}

export function AssumptionSection({
  title,
  assumptions,
  onValueChange,
  updatingIds,
  defaultOpen = true,
}: AssumptionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (assumptions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground/50 bg-muted/30 px-2 py-0.5 rounded-full">
            {assumptions.length}
          </span>
        </div>
      </button>

      {/* Assumption rows */}
      {isOpen && (
        <div className="px-3 pb-3 space-y-1">
          {assumptions.map((assumption) => (
            <AssumptionRow
              key={assumption.id}
              assumption={assumption}
              onValueChange={onValueChange}
              isUpdating={updatingIds.has(assumption.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

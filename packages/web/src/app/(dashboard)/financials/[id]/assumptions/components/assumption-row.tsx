'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AlertCircle, Bot, UserCheck, Calculator, FlaskConical } from 'lucide-react';

type ValueType = 'CURRENCY' | 'PERCENTAGE' | 'NUMBER' | 'TEXT';
type Confidence = 'USER' | 'RESEARCHED' | 'AI_ESTIMATE' | 'CALCULATED';

interface AssumptionRowProps {
  assumption: {
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
  };
  onValueChange: (id: string, value: string) => void;
  isUpdating?: boolean;
}

const confidenceConfig: Record<Confidence, { icon: React.ReactNode; color: string; label: string }> = {
  USER: { icon: <UserCheck className="w-3 h-3" />, color: 'text-emerald-400', label: 'User' },
  RESEARCHED: { icon: <FlaskConical className="w-3 h-3" />, color: 'text-blue-400', label: 'Researched' },
  AI_ESTIMATE: { icon: <Bot className="w-3 h-3" />, color: 'text-amber-400', label: 'AI Est.' },
  CALCULATED: { icon: <Calculator className="w-3 h-3" />, color: 'text-purple-400', label: 'Calc' },
};

const valueTypePrefixes: Record<ValueType, string> = {
  CURRENCY: '$',
  PERCENTAGE: '',
  NUMBER: '',
  TEXT: '',
};

const valueTypeSuffixes: Record<ValueType, string> = {
  CURRENCY: '',
  PERCENTAGE: '%',
  NUMBER: '',
  TEXT: '',
};

export function AssumptionRow({ assumption, onValueChange, isUpdating }: AssumptionRowProps) {
  const [editValue, setEditValue] = useState(assumption.value ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isCalculated = !!assumption.formula;
  const confidence = confidenceConfig[assumption.confidence as Confidence] ?? confidenceConfig.AI_ESTIMATE;
  const valueType = assumption.valueType as ValueType;
  const prefix = valueTypePrefixes[valueType] ?? '';
  const suffix = valueTypeSuffixes[valueType] ?? '';

  // Sync external changes
  useEffect(() => {
    if (!isFocused) {
      setEditValue(assumption.value ?? '');
    }
  }, [assumption.value, isFocused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setEditValue(newValue);

      // Debounce auto-save (3 seconds)
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onValueChange(assumption.id, newValue);
      }, 3000);
    },
    [assumption.id, onValueChange],
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Save immediately on blur
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (editValue !== (assumption.value ?? '')) {
      onValueChange(assumption.id, editValue);
    }
  }, [assumption.id, assumption.value, editValue, onValueChange]);

  const displayValue = assumption.numericValue ?? assumption.value;

  return (
    <div
      className={`
        group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
        ${isFocused
          ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
          : 'border-border bg-card hover:border-border/80 hover:bg-card/80'
        }
        ${isUpdating ? 'opacity-70' : ''}
      `}
    >
      {/* Label + confidence */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {assumption.name}
          </span>
          <span className={`flex items-center gap-0.5 ${confidence.color}`} title={confidence.label}>
            {confidence.icon}
          </span>
          {isCalculated && (
            <span className="text-[10px] text-muted-foreground/40 bg-muted/30 px-1.5 py-0.5 rounded">
              formula
            </span>
          )}
        </div>
        {assumption.unit && (
          <span className="text-[11px] text-muted-foreground/40">{assumption.unit}</span>
        )}
      </div>

      {/* Value input */}
      <div className="flex items-center gap-1 w-[180px] flex-shrink-0">
        {isCalculated ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground font-mono tabular-nums">
            {prefix && <span className="text-muted-foreground/40">{prefix}</span>}
            <span>{displayValue ?? '—'}</span>
            {suffix && <span className="text-muted-foreground/40">{suffix}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1 w-full">
            {prefix && <span className="text-sm text-muted-foreground/40">{prefix}</span>}
            <input
              type={valueType === 'TEXT' ? 'text' : 'number'}
              value={editValue}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={handleBlur}
              className="
                w-full bg-transparent text-sm text-foreground font-mono tabular-nums
                text-right outline-none placeholder:text-muted-foreground/30
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
              "
              placeholder="—"
              step="any"
            />
            {suffix && <span className="text-sm text-muted-foreground/40">{suffix}</span>}
          </div>
        )}
      </div>

      {/* Update indicator */}
      {isUpdating && (
        <div className="w-4 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}
    </div>
  );
}

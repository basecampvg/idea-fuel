'use client';

import { useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

interface SubAssumptionRowProps {
  id: string;
  name: string;
  key_: string;
  value: string | null;
  unit: string | null;
  formula: string | null;
  onDelete: (id: string) => void;
  onValueChange: (id: string, value: string) => void;
}

function formatValue(value: string | null, unit: string | null): string {
  if (value === null || value === '') return '\u2014';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (unit === '$') return `$${num.toLocaleString()}`;
  if (unit === '%') return `${num}%`;
  return num.toLocaleString();
}

export function SubAssumptionRow({
  id,
  name,
  value,
  unit,
  formula,
  onDelete,
  onValueChange,
}: SubAssumptionRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? '');

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue !== (value ?? '')) {
      onValueChange(id, editValue);
    }
  }, [id, editValue, value, onValueChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setEditValue(value ?? '');
      setIsEditing(false);
    }
  }, [value]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 group transition-colors">
      {/* Name */}
      <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
        {name}
      </span>

      {/* Value */}
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-24 text-right text-xs font-mono bg-background border border-input rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <button
          type="button"
          onClick={() => { setEditValue(value ?? ''); setIsEditing(true); }}
          className="text-xs font-mono text-foreground/80 hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors text-right min-w-[80px]"
          disabled={!!formula}
          title={formula ? `Calculated: ${formula}` : 'Click to edit'}
        >
          {formatValue(value, unit)}
        </button>
      )}

      {/* Formula indicator */}
      {formula && (
        <span className="text-[9px] text-violet-400/70 font-mono flex-shrink-0" title={formula}>
          f(x)
        </span>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(id)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all p-0.5 rounded"
        title="Remove"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

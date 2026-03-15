'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface SubRow {
  id: string;
  name: string;
  key: string;
  value: string | null;
  unit: string | null;
  formula: string | null;
}

interface InputCardProps {
  id: string;
  name: string;
  value: string | null;
  unit: string | null;
  formula: string | null;
  children_?: SubRow[];
  aggregationMode?: string | null;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onValueChange: (id: string, value: string) => void;
  onAddSub?: (parentId: string, data: { name: string; key: string; value: string }) => void;
  onDeleteSub?: (id: string) => void;
  onSubValueChange?: (id: string, value: string) => void;
}

function formatDisplay(value: string | null, unit: string | null): string {
  if (value === null || value === '') return '\u2014';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (unit === '$') {
    if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toLocaleString()}`;
  }
  if (unit === '%') return `${num}%`;
  if (unit === 'x') return `${num}x`;
  if (unit) return `${num} ${unit}`;
  return num.toLocaleString();
}

function InlineValueInput({
  value,
  unit,
  disabled,
  onChange,
}: {
  value: string | null;
  unit: string | null;
  disabled?: boolean;
  onChange: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value ?? ''); }, [value]);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft !== (value ?? '')) onChange(draft);
  }, [draft, value, onChange]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') inputRef.current?.blur();
          if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
        }}
        autoFocus
        className="w-full text-right font-mono text-sm bg-background border border-input rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className={`text-right font-mono text-sm px-2 py-1 rounded-md transition-colors min-w-[80px] ${
        disabled
          ? 'text-muted-foreground/60 cursor-default'
          : 'text-foreground hover:bg-muted/50 cursor-text'
      }`}
      title={disabled ? 'Calculated from formula' : 'Click to edit'}
    >
      {formatDisplay(value, unit)}
    </button>
  );
}

export function InputCard({
  id,
  name,
  value,
  unit,
  formula,
  children_,
  aggregationMode,
  isExpanded,
  onToggleExpand,
  onValueChange,
  onAddSub,
  onDeleteSub,
  onSubValueChange,
}: InputCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addValue, setAddValue] = useState('');
  const hasChildren = children_ && children_.length > 0;
  const isCalculated = !!formula && !hasChildren;

  const handleAdd = useCallback(() => {
    if (!addName.trim() || !onAddSub) return;
    const key = addName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 64);
    onAddSub(id, { name: addName.trim(), key, value: addValue || '0' });
    setAddName('');
    setAddValue('');
    setShowAddForm(false);
  }, [id, addName, addValue, onAddSub]);

  return (
    <div className={`
      rounded-lg border bg-card transition-all duration-150
      ${isExpanded ? 'border-foreground/20 shadow-sm' : 'border-border hover:border-foreground/15'}
    `}>
      {/* Card header — click to expand */}
      <button
        type="button"
        onClick={() => onToggleExpand(id)}
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <div className="flex items-center gap-2 min-w-0">
          {(hasChildren || onAddSub) ? (
            isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <span className="w-3.5" />
          )}
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
          {hasChildren && (
            <span className="text-[10px] text-muted-foreground/50 font-medium flex-shrink-0">
              {children_.length} rows · {aggregationMode ?? 'SUM'}
            </span>
          )}
          {isCalculated && (
            <span className="text-[10px] text-violet-400/70 font-mono flex-shrink-0">f(x)</span>
          )}
        </div>
        <span className="font-mono text-sm font-semibold text-foreground flex-shrink-0">
          {formatDisplay(value, unit)}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 px-4 py-3 space-y-1">
          {/* If no children, show single editable value */}
          {!hasChildren && (
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Value</span>
              <InlineValueInput
                value={value}
                unit={unit}
                disabled={isCalculated}
                onChange={(val) => onValueChange(id, val)}
              />
            </div>
          )}

          {/* Sub-rows */}
          {children_?.map((child) => (
            <div key={child.id} className="flex items-center justify-between py-1.5 group">
              <span className="text-xs text-muted-foreground truncate flex-1 min-w-0 pr-2">
                {child.name}
              </span>
              <div className="flex items-center gap-1.5">
                <InlineValueInput
                  value={child.value}
                  unit={child.unit ?? unit}
                  disabled={!!child.formula}
                  onChange={(val) => onSubValueChange?.(child.id, val)}
                />
                {child.formula && (
                  <span className="text-[9px] text-violet-400/60 font-mono" title={child.formula}>f(x)</span>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteSub?.(child.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-destructive transition-all p-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Add row form */}
          {onAddSub && (
            showAddForm ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                  className="flex-1 min-w-0 text-xs bg-background border border-input rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="text"
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  placeholder="Value"
                  className="w-20 text-right text-xs font-mono bg-background border border-input rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button type="submit" disabled={!addName.trim()} className="text-primary hover:bg-primary/10 p-1 rounded disabled:opacity-30">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground p-1 rounded">
                  ✕
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 w-full px-1 py-1.5 text-[11px] text-muted-foreground/40 hover:text-primary rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add row
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

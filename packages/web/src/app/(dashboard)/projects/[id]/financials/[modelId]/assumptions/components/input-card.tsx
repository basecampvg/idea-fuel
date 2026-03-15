'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, FunctionSquare, ArrowRight } from 'lucide-react';
import { FormulaEditor } from './formula-editor';
import type { AssumptionConfidence } from '@forge/shared';

interface SubRow {
  id: string;
  name: string;
  key: string;
  value: string | null;
  unit: string | null;
  formula: string | null;
}

interface AvailableAssumption {
  key: string;
  name: string;
  value: string | null;
  unit: string | null;
}

interface InputCardProps {
  id: string;
  name: string;
  key_: string;
  value: string | null;
  unit: string | null;
  formula: string | null;
  confidence?: AssumptionConfidence;
  dependsOn?: string[];
  children_?: SubRow[];
  aggregationMode?: string | null;
  allAssumptions?: AvailableAssumption[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onValueChange: (id: string, value: string) => void;
  onFormulaChange?: (id: string, formula: string | null) => void;
  onAddSub?: (parentId: string, data: { name: string; key: string; value: string }) => void;
  onDeleteSub?: (id: string) => void;
  onSubValueChange?: (id: string, value: string) => void;
}

const CONFIDENCE_BORDER_COLORS: Record<string, string> = {
  USER: 'border-l-primary',
  RESEARCHED: 'border-l-green-500',
  AI_ESTIMATE: 'border-l-amber-500',
  CALCULATED: 'border-l-violet-400',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  USER: 'User-set',
  RESEARCHED: 'Researched',
  AI_ESTIMATE: 'AI Estimate',
  CALCULATED: 'Calculated',
};

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
        className="w-24 text-right font-mono text-sm bg-background border border-input rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
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
  confidence,
  dependsOn,
  children_,
  aggregationMode,
  allAssumptions,
  isExpanded,
  onToggleExpand,
  onValueChange,
  onFormulaChange,
  onAddSub,
  onDeleteSub,
  onSubValueChange,
}: InputCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [addName, setAddName] = useState('');
  const [addValue, setAddValue] = useState('');
  const hasChildren = children_ && children_.length > 0;
  const isCalculated = !!formula && !hasChildren;
  const displayConfidence = confidence ?? (isCalculated ? 'CALCULATED' : 'USER');
  const borderColor = CONFIDENCE_BORDER_COLORS[displayConfidence] ?? 'border-l-primary';

  const handleAdd = useCallback(() => {
    if (!addName.trim() || !onAddSub) return;
    const key = addName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 64);
    onAddSub(id, { name: addName.trim(), key, value: addValue || '0' });
    setAddName('');
    setAddValue('');
    setShowAddForm(false);
  }, [id, addName, addValue, onAddSub]);

  return (
    <div
      className={`
        group relative w-full text-left rounded-lg border border-border bg-card
        transition-all duration-150 ease-out
        hover:border-foreground/20 hover:shadow-sm
        border-l-4 ${isExpanded ? 'border-l-orange-500 ring-2 ring-orange-500/20 shadow-sm' : borderColor}
      `}
    >
      {/* Card header — compact, click to expand */}
      <button
        type="button"
        onClick={() => onToggleExpand(id)}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-lg"
      >
        <div className="px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {(hasChildren || onAddSub) ? (
              isExpanded
                ? <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                : <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
            )}
            <span className="text-xs text-muted-foreground truncate font-medium">{name}</span>
            {hasChildren && (
              <span className="text-[10px] text-muted-foreground/40">{children_.length} rows</span>
            )}
            {isCalculated && (
              <span className="text-[9px] text-violet-400/60 font-mono">f(x)</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`font-mono text-sm font-semibold ${
              value === null || value === '' ? 'text-muted-foreground/40' : 'text-foreground'
            }`}>
              {formatDisplay(value, unit)}
            </span>
            <span className={`text-[9px] font-medium ${
              displayConfidence === 'USER' ? 'text-primary' :
              displayConfidence === 'RESEARCHED' ? 'text-green-500' :
              displayConfidence === 'AI_ESTIMATE' ? 'text-amber-500' :
              'text-violet-400'
            }`}>
              {CONFIDENCE_LABELS[displayConfidence] ?? displayConfidence}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 px-4 py-3 space-y-2 bg-muted/5">
          {/* Value + Formula toggle */}
          {!hasChildren && (
            <div className="space-y-2">
              {/* Value row */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground font-medium">Value</span>
                <InlineValueInput
                  value={value}
                  unit={unit}
                  disabled={isCalculated}
                  onChange={(val) => onValueChange(id, val)}
                />
              </div>

              {/* Formula section */}
              {showFormulaEditor ? (
                <FormulaEditor
                  formula={formula ?? ''}
                  availableAssumptions={allAssumptions ?? []}
                  onChange={(f) => {
                    onFormulaChange?.(id, f);
                    setShowFormulaEditor(false);
                  }}
                  onCancel={() => setShowFormulaEditor(false)}
                />
              ) : formula ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Formula</span>
                    <button
                      type="button"
                      onClick={() => setShowFormulaEditor(true)}
                      className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="px-2 py-1.5 rounded bg-violet-500/5 border border-violet-400/10">
                    <code className="text-[11px] font-mono text-violet-400/80 break-all">
                      = {formula}
                    </code>
                  </div>
                  {/* Dependencies */}
                  {dependsOn && dependsOn.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-muted-foreground/40">Depends on:</span>
                      {dependsOn.map((dep) => (
                        <span
                          key={dep}
                          className="text-[9px] font-mono text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Clear formula */}
                  <button
                    type="button"
                    onClick={() => onFormulaChange?.(id, null)}
                    className="text-[10px] text-muted-foreground/40 hover:text-destructive transition-colors"
                  >
                    Remove formula
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowFormulaEditor(true)}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-violet-400 transition-colors py-1"
                >
                  <FunctionSquare className="w-3 h-3" />
                  Add formula
                </button>
              )}
            </div>
          )}

          {/* Sub-rows */}
          {children_?.map((child) => (
            <div key={child.id} className="flex items-center justify-between py-1.5 group/row rounded-md hover:bg-muted/30 px-2 -mx-2">
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
                  className="opacity-0 group-hover/row:opacity-100 text-muted-foreground/30 hover:text-destructive transition-all p-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Add row */}
          {onAddSub && (
            showAddForm ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
                className="flex items-center gap-2 pt-1.5"
              >
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Name (e.g. Tier A)"
                  autoFocus
                  className="flex-1 min-w-0 text-xs bg-background border border-input rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                />
                <input
                  type="text"
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  placeholder="Value"
                  className="w-20 text-right text-xs font-mono bg-background border border-input rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                />
                <button type="submit" disabled={!addName.trim()} className="text-primary hover:bg-primary/10 p-1 rounded disabled:opacity-30">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground p-1 rounded text-xs">
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

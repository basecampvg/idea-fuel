'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';

interface AvailableAssumption {
  key: string;
  name: string;
  value: string | null;
  unit: string | null;
}

interface FormulaEditorProps {
  formula: string;
  availableAssumptions: AvailableAssumption[];
  onChange: (formula: string | null) => void;
  onCancel: () => void;
}

/**
 * Formula editor with autocomplete for assumption names.
 * Shows a dropdown of matching assumption keys as the user types.
 */
export function FormulaEditor({
  formula,
  availableAssumptions,
  onChange,
  onCancel,
}: FormulaEditorProps) {
  const [draft, setDraft] = useState(formula);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract the current word being typed (for autocomplete)
  const currentWord = useMemo(() => {
    if (!inputRef.current) return '';
    const pos = inputRef.current.selectionStart ?? draft.length;
    const before = draft.slice(0, pos);
    // Find the start of the current identifier (letters, digits, underscores)
    const match = before.match(/([a-z_][a-z0-9_]*)$/i);
    return match ? match[1] : '';
  }, [draft]);

  // Filter suggestions based on current word
  const suggestions = useMemo(() => {
    if (!currentWord || currentWord.length < 2) return [];
    const lower = currentWord.toLowerCase();
    return availableAssumptions
      .filter((a) => a.key.toLowerCase().includes(lower) || a.name.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [currentWord, availableAssumptions]);

  useEffect(() => {
    setShowSuggestions(suggestions.length > 0);
    setSelectedSuggestion(0);
  }, [suggestions]);

  const insertSuggestion = useCallback((key: string) => {
    const pos = inputRef.current?.selectionStart ?? draft.length;
    const before = draft.slice(0, pos);
    const after = draft.slice(pos);
    // Replace the current word with the selected key
    const wordStart = before.search(/[a-z_][a-z0-9_]*$/i);
    const newBefore = wordStart >= 0 ? before.slice(0, wordStart) + key : before + key;
    setDraft(newBefore + after);
    setShowSuggestions(false);
    // Focus back and set cursor after inserted key
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = newBefore.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [draft]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (suggestions[selectedSuggestion]) {
          e.preventDefault();
          insertSuggestion(suggestions[selectedSuggestion].key);
          return;
        }
      }
    }

    if (e.key === 'Enter' && !showSuggestions) {
      e.preventDefault();
      onChange(draft.trim() || null);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [showSuggestions, suggestions, selectedSuggestion, draft, onChange, onCancel, insertSuggestion]);

  const formatValue = (value: string | null, unit: string | null) => {
    if (!value) return '';
    const n = Number(value);
    if (isNaN(n)) return value;
    if (unit === '$') return `$${n.toLocaleString()}`;
    if (unit === '%') return `${n}%`;
    return String(n);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-violet-400 font-mono font-bold">=</span>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          autoFocus
          placeholder="headcount * avg_salary / 12"
          className="flex-1 text-xs font-mono bg-background border border-violet-400/30 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400/50 placeholder:text-muted-foreground/30"
        />
        <button
          type="button"
          onClick={() => onChange(draft.trim() || null)}
          className="text-[10px] font-medium text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-4 right-0 mt-1 z-50 bg-card border border-border rounded-md shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertSuggestion(s.key); }}
              className={`
                w-full text-left px-3 py-1.5 flex items-center justify-between gap-2
                ${i === selectedSuggestion ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50'}
              `}
            >
              <div className="min-w-0">
                <span className="text-xs font-mono">{s.key}</span>
                <span className="text-[10px] text-muted-foreground/50 ml-2">{s.name}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/40 flex-shrink-0">
                {formatValue(s.value, s.unit)}
              </span>
            </button>
          ))}
          <div className="px-3 py-1 border-t border-border/50 bg-muted/20">
            <span className="text-[9px] text-muted-foreground/40">
              Tab to insert · Enter to save · Esc to cancel
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

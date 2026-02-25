'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  RotateCcw,
  Save,
  ChevronDown,
  Circle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { TOKEN_CATEGORIES, tokenKey } from '../lib/token-types';
import type { TokenDefinition, TokenCategory } from '../lib/token-types';
import { useTokenEditor } from '../hooks/use-token-editor';

// ---------------------------------------------------------------------------
// HSL Picker Popover
// ---------------------------------------------------------------------------

function HslPicker({
  h,
  s,
  l,
  onChange,
  onClose,
}: {
  h: number;
  s: number;
  l: number;
  onChange: (h: number, s: number, l: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 z-50 p-4 rounded-xl bg-popover border border-border shadow-lg w-64"
    >
      {/* Preview */}
      <div
        className="w-full h-10 rounded-lg mb-4 border border-border"
        style={{ backgroundColor: `hsl(${h}, ${s}%, ${l}%)` }}
      />

      {/* Hue */}
      <label className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-mono text-muted-foreground w-4">H</span>
        <input
          type="range"
          min={0}
          max={360}
          value={h}
          onChange={(e) => onChange(Number(e.target.value), s, l)}
          className="flex-1 accent-primary h-1.5"
          style={{
            background: `linear-gradient(to right, hsl(0,${s}%,${l}%), hsl(60,${s}%,${l}%), hsl(120,${s}%,${l}%), hsl(180,${s}%,${l}%), hsl(240,${s}%,${l}%), hsl(300,${s}%,${l}%), hsl(360,${s}%,${l}%))`,
          }}
        />
        <input
          type="number"
          min={0}
          max={360}
          value={h}
          onChange={(e) => onChange(Number(e.target.value), s, l)}
          className="w-14 px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground"
        />
      </label>

      {/* Saturation */}
      <label className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-mono text-muted-foreground w-4">S</span>
        <input
          type="range"
          min={0}
          max={100}
          value={s}
          onChange={(e) => onChange(h, Number(e.target.value), l)}
          className="flex-1 accent-primary h-1.5"
          style={{
            background: `linear-gradient(to right, hsl(${h},0%,${l}%), hsl(${h},100%,${l}%))`,
          }}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={s}
          onChange={(e) => onChange(h, Number(e.target.value), l)}
          className="w-14 px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground"
        />
      </label>

      {/* Lightness */}
      <label className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-muted-foreground w-4">L</span>
        <input
          type="range"
          min={0}
          max={100}
          value={l}
          onChange={(e) => onChange(h, s, Number(e.target.value))}
          className="flex-1 accent-primary h-1.5"
          style={{
            background: `linear-gradient(to right, hsl(${h},${s}%,0%), hsl(${h},${s}%,50%), hsl(${h},${s}%,100%))`,
          }}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={l}
          onChange={(e) => onChange(h, s, Number(e.target.value))}
          className="w-14 px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground"
        />
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parse HSL string to { h, s, l }
// ---------------------------------------------------------------------------

function parseHsl(raw: string): { h: number; s: number; l: number; a?: number } {
  const parts = raw.split(/[\s/]+/).map((p) => parseFloat(p));
  return {
    h: parts[0] || 0,
    s: parts[1] || 0,
    l: parts[2] || 0,
    a: parts[3],
  };
}

function formatHsl(h: number, s: number, l: number, a?: number): string {
  if (a !== undefined) {
    return `${h} ${s}% ${l}% / ${a}`;
  }
  return `${h} ${s}% ${l}%`;
}

// ---------------------------------------------------------------------------
// Token Row — renders differently based on format
// ---------------------------------------------------------------------------

function TokenRow({
  token,
  currentValue,
  isDirty,
  onEdit,
  onReset,
}: {
  token: TokenDefinition;
  currentValue: string;
  isDirty: boolean;
  onEdit: (value: string) => void;
  onReset: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const key = tokenKey(token.selector, token.name);

  if (token.format === 'hsl' || token.format === 'hsl-alpha') {
    const { h, s, l, a } = parseHsl(currentValue);

    const colorStr =
      a !== undefined
        ? `hsl(${h} ${s}% ${l}% / ${a})`
        : `hsl(${h}, ${s}%, ${l}%)`;

    return (
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isDirty ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'
        }`}
      >
        {/* Color swatch — click to open picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen(!pickerOpen)}
            className="w-8 h-8 rounded-lg border border-border shrink-0 cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: colorStr }}
            title="Click to open color picker"
          />
          {pickerOpen && (
            <HslPicker
              h={h}
              s={s}
              l={l}
              onChange={(nh, ns, nl) => onEdit(formatHsl(nh, ns, nl, a))}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        {/* Token name */}
        <span className="font-mono text-xs text-muted-foreground w-48 shrink-0 truncate">
          {token.name}
        </span>

        {/* H / S / L inputs */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={360}
            value={h}
            onChange={(e) => onEdit(formatHsl(Number(e.target.value), s, l, a))}
            className="w-14 px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground text-center"
            title="Hue (0-360)"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={s}
            onChange={(e) => onEdit(formatHsl(h, Number(e.target.value), l, a))}
            className="w-14 px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground text-center"
            title="Saturation (0-100)"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={l}
            onChange={(e) => onEdit(formatHsl(h, s, Number(e.target.value), a))}
            className="w-14 px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground text-center"
            title="Lightness (0-100)"
          />
          {a !== undefined && (
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={a}
              onChange={(e) => onEdit(formatHsl(h, s, l, Number(e.target.value)))}
              className="w-14 px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground text-center"
              title="Alpha (0-1)"
            />
          )}
        </div>

        {/* Reset button */}
        {isDirty && (
          <button
            type="button"
            onClick={onReset}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={`Reset to ${token.rawValue}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (token.format === 'hex') {
    return (
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isDirty ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'
        }`}
      >
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={currentValue}
            onChange={(e) => onEdit(e.target.value)}
            className="w-8 h-8 rounded-lg border border-border cursor-pointer"
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground w-48 shrink-0 truncate">
          {token.name}
        </span>
        <input
          type="text"
          value={currentValue}
          onChange={(e) => onEdit(e.target.value)}
          className="w-28 px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground"
          placeholder="#000000"
        />
        {isDirty && (
          <button
            type="button"
            onClick={onReset}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={`Reset to ${token.rawValue}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (token.format === 'rem') {
    const numVal = parseFloat(currentValue);
    return (
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isDirty ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'
        }`}
      >
        {/* Corner radius preview */}
        <div
          className="w-8 h-8 border-2 border-primary shrink-0"
          style={{ borderRadius: currentValue }}
        />
        <span className="font-mono text-xs text-muted-foreground w-48 shrink-0 truncate">
          {token.name}
        </span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={4}
            step={0.125}
            value={numVal}
            onChange={(e) => onEdit(`${e.target.value}rem`)}
            className="w-20 px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground text-center"
          />
          <span className="text-xs font-mono text-muted-foreground">rem</span>
        </div>
        {isDirty && (
          <button
            type="button"
            onClick={onReset}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={`Reset to ${token.rawValue}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (token.format === 'gradient') {
    return (
      <div
        className={`px-3 py-2 rounded-lg transition-colors ${
          isDirty ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-8 h-8 rounded-lg border border-border shrink-0"
            style={{ background: currentValue }}
          />
          <span className="font-mono text-xs text-muted-foreground w-48 shrink-0 truncate">
            {token.name}
          </span>
          {isDirty && (
            <button
              type="button"
              onClick={onReset}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={`Reset to original`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Gradient preview bar */}
        <div
          className="w-full h-3 rounded-full mb-2 border border-border"
          style={{ background: currentValue }}
        />
        <textarea
          value={currentValue}
          onChange={(e) => onEdit(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-xs font-mono bg-muted rounded-lg border border-border text-foreground resize-none"
        />
      </div>
    );
  }

  // Fallback: transition or unknown — plain text input
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isDirty ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'
      }`}
    >
      <div className="w-8 h-8 shrink-0" />
      <span className="font-mono text-xs text-muted-foreground w-48 shrink-0 truncate">
        {token.name}
      </span>
      <input
        type="text"
        value={currentValue}
        onChange={(e) => onEdit(e.target.value)}
        className="flex-1 px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground"
      />
      {isDirty && (
        <button
          type="button"
          onClick={onReset}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={`Reset to ${token.rawValue}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category Group — collapsible
// ---------------------------------------------------------------------------

function CategoryGroup({
  category,
  tokens,
  isExpanded,
  onToggle,
  getCurrentValue,
  isTokenDirty,
  editToken,
  resetToken,
}: {
  category: { key: TokenCategory; label: string; description: string };
  tokens: TokenDefinition[];
  isExpanded: boolean;
  onToggle: () => void;
  getCurrentValue: (key: string) => string;
  isTokenDirty: (key: string) => boolean;
  editToken: (key: string, name: string, value: string) => void;
  resetToken: (key: string, name: string) => void;
}) {
  const hasDirty = tokens.some((t) => isTokenDirty(tokenKey(t.selector, t.name)));

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isExpanded ? '' : '-rotate-90'
          }`}
        />
        <span className="text-sm font-medium text-foreground">{category.label}</span>
        <span className="text-[10px] text-muted-foreground">{tokens.length} tokens</span>
        {hasDirty && (
          <Circle className="w-2 h-2 fill-primary text-primary ml-auto" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border px-2 py-2 space-y-0.5">
          {tokens.map((token) => {
            const key = tokenKey(token.selector, token.name);
            return (
              <TokenRow
                key={key}
                token={token}
                currentValue={getCurrentValue(key)}
                isDirty={isTokenDirty(key)}
                onEdit={(value) => editToken(key, token.name, value)}
                onReset={() => resetToken(key, token.name)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Token Editor — Main Component
// ---------------------------------------------------------------------------

export function TokenEditor() {
  const {
    status,
    error,
    activeTheme,
    searchQuery,
    expandedCategories,
    tokensByCategory,
    dirtyCount,
    isDirty,
    editToken,
    resetToken,
    resetAll,
    saveChanges,
    setTheme,
    setSearch,
    toggleCategory,
    getCurrentValue,
    isTokenDirty,
  } = useTokenEditor();

  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetAll = useCallback(() => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    resetAll();
    setConfirmReset(false);
  }, [confirmReset, resetAll]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Loading tokens...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Theme toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTheme === 'dark'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTheme === 'light'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Light
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tokens..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted rounded-lg border border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Dirty count */}
          {isDirty && (
            <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
              {dirtyCount} unsaved
            </span>
          )}

          {/* Reset All */}
          {isDirty && (
            <button
              type="button"
              onClick={handleResetAll}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                confirmReset
                  ? 'border-red-500/30 bg-red-500/10 text-red-500'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {confirmReset ? 'Confirm Reset' : 'Reset All'}
            </button>
          )}

          {/* Save */}
          <button
            type="button"
            onClick={saveChanges}
            disabled={!isDirty || status === 'saving'}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'saving' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save to File
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}

        {/* Theme mismatch hint */}
        {activeTheme === 'light' && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Editing light theme tokens. Switch your app to light mode to see live preview.
          </p>
        )}
      </div>

      {/* Category groups */}
      <div className="space-y-3">
        {TOKEN_CATEGORIES.map((cat) => {
          const tokens = tokensByCategory.get(cat.key);
          if (!tokens || tokens.length === 0) return null;

          return (
            <CategoryGroup
              key={cat.key}
              category={cat}
              tokens={tokens}
              isExpanded={expandedCategories.has(cat.key)}
              onToggle={() => toggleCategory(cat.key)}
              getCurrentValue={getCurrentValue}
              isTokenDirty={isTokenDirty}
              editToken={editToken}
              resetToken={resetToken}
            />
          );
        })}
      </div>

      {/* Keyboard shortcut hint */}
      <p className="text-[10px] text-muted-foreground text-center pb-8">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">Ctrl+S</kbd> to save changes
      </p>
    </div>
  );
}

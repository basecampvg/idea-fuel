'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import type { PropDefinition } from '../lib/pattern-registry';

// ---------------------------------------------------------------------------
// Component Playground — interactive prop controls for extracted components
// ---------------------------------------------------------------------------

interface ComponentPlaygroundProps {
  componentName: string;
  props: PropDefinition[];
  renderPreview: (propValues: Record<string, unknown>) => React.ReactNode;
  filePath: string;
}

export function ComponentPlayground({
  componentName,
  props,
  renderPreview,
  filePath,
}: ComponentPlaygroundProps) {
  // Initialize prop values with defaults
  const [propValues, setPropValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const prop of props) {
      if (prop.default) {
        // Strip quotes from string defaults
        initial[prop.name] = prop.default.replace(/^['"]|['"]$/g, '');
      } else if (prop.type === 'boolean') {
        initial[prop.name] = false;
      } else if (prop.type === 'enum' && prop.options?.length) {
        initial[prop.name] = prop.options[0];
      }
    }
    return initial;
  });

  const [copied, setCopied] = useState(false);

  const updateProp = useCallback((name: string, value: unknown) => {
    setPropValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Generate JSX usage string
  const generateJsx = useCallback(() => {
    const propsStr = props
      .filter((p) => {
        const val = propValues[p.name];
        if (val === undefined || val === null) return false;
        // Skip if matches default
        if (p.default && String(val) === p.default.replace(/^['"]|['"]$/g, '')) return false;
        // Skip ReactNode/icon props (can't serialize meaningfully)
        if (p.type === 'ReactNode' || p.type === 'icon') return false;
        return true;
      })
      .map((p) => {
        const val = propValues[p.name];
        if (typeof val === 'boolean') return val ? p.name : null;
        if (typeof val === 'number') return `${p.name}={${val}}`;
        return `${p.name}="${val}"`;
      })
      .filter(Boolean)
      .join(' ');

    return `<${componentName}${propsStr ? ` ${propsStr}` : ''} />`;
  }, [componentName, props, propValues]);

  const copyJsx = useCallback(() => {
    navigator.clipboard.writeText(generateJsx());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [generateJsx]);

  // Only show controllable props (exclude ReactNode and icon types for now)
  const controllableProps = props.filter(
    (p) => p.type !== 'ReactNode' && p.type !== 'icon',
  );

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Preview pane */}
        <div className="p-6 bg-card/30 flex items-center justify-center min-h-[140px]">
          {renderPreview(propValues)}
        </div>

        {/* Props controls */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-foreground">
              Props
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {filePath}
            </span>
          </div>

          {controllableProps.map((prop) => (
            <PropControl
              key={prop.name}
              prop={prop}
              value={propValues[prop.name]}
              onChange={(val) => updateProp(prop.name, val)}
            />
          ))}

          {/* Copy JSX button */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[10px] font-mono text-muted-foreground bg-muted rounded px-2 py-1.5 truncate">
                {generateJsx()}
              </code>
              <button
                type="button"
                onClick={copyJsx}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Copy JSX"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual Prop Control
// ---------------------------------------------------------------------------

function PropControl({
  prop,
  value,
  onChange,
}: {
  prop: PropDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (prop.type === 'enum' && prop.options) {
    return (
      <label className="block">
        <span className="text-[10px] font-mono text-muted-foreground">{prop.name}</span>
        <div className="flex gap-1 mt-1 flex-wrap">
          {prop.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
                value === opt
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </label>
    );
  }

  if (prop.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-primary"
        />
        <span className="text-[10px] font-mono text-muted-foreground">{prop.name}</span>
      </label>
    );
  }

  if (prop.type === 'number') {
    return (
      <label className="block">
        <span className="text-[10px] font-mono text-muted-foreground">{prop.name}</span>
        <input
          type="number"
          value={Number(value) || 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1 w-full px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground"
        />
      </label>
    );
  }

  // Default: string input
  return (
    <label className="block">
      <span className="text-[10px] font-mono text-muted-foreground">{prop.name}</span>
      <input
        type="text"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-foreground"
        placeholder={prop.description}
      />
    </label>
  );
}

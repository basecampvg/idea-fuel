'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Clock, Link2, GitBranch, AlertTriangle, Info } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { ValueEditor } from './value-editor';
import { CascadePreview } from './cascade-preview';
import type { AssumptionConfidence, AssumptionCategory, AssumptionValueType, CascadeResult } from '@forge/shared';

interface AssumptionData {
  id: string;
  projectId: string;
  name: string;
  key: string;
  value: string | null;
  valueType: AssumptionValueType;
  unit: string | null;
  confidence: AssumptionConfidence;
  effectiveConfidence?: AssumptionConfidence;
  category: AssumptionCategory;
  source: string;
  sourceUrl: string | null;
  formula: string | null;
  dependsOn: string[];
  isRequired: boolean;
  staleness?: { isStale: boolean; reason?: string; daysSinceUpdate?: number };
}

interface AssumptionDetailPanelProps {
  assumption: AssumptionData | null;
  allAssumptions: AssumptionData[];
  onClose: () => void;
  onCascadeComplete: (cascadedKeys: string[]) => void;
}

const CONFIDENCE_OPTIONS: { value: AssumptionConfidence; label: string; color: string }[] = [
  { value: 'USER', label: 'User-set', color: 'bg-primary' },
  { value: 'RESEARCHED', label: 'Researched', color: 'bg-green-500' },
  { value: 'AI_ESTIMATE', label: 'AI Estimate', color: 'bg-amber-500' },
];

export function AssumptionDetailPanel({
  assumption,
  allAssumptions,
  onClose,
  onCascadeComplete,
}: AssumptionDetailPanelProps) {
  const utils = trpc.useUtils();
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [cascadePreview, setCascadePreview] = useState<CascadeResult | null>(null);
  const [showFormulaWarning, setShowFormulaWarning] = useState(false);

  // Reset state when assumption changes
  useEffect(() => {
    setPendingValue(null);
    setCascadePreview(null);
    setShowFormulaWarning(false);
  }, [assumption?.id]);

  // Cascade preview query
  const cascadeQuery = trpc.assumption.getCascadePreview.useQuery(
    {
      projectId: assumption?.projectId ?? '',
      key: assumption?.key ?? '',
      newValue: pendingValue ?? '',
    },
    {
      enabled: !!assumption && pendingValue !== null && pendingValue !== assumption.value,
    },
  );

  // Sync cascade query result
  useEffect(() => {
    if (cascadeQuery.data) {
      setCascadePreview(cascadeQuery.data as CascadeResult);
    }
  }, [cascadeQuery.data]);

  // Update mutation
  const updateMutation = trpc.assumption.update.useMutation({
    onSuccess: (data) => {
      utils.assumption.list.invalidate({ projectId: assumption?.projectId });
      setPendingValue(null);
      setCascadePreview(null);
      setShowFormulaWarning(false);

      // Trigger cascade animation on affected keys
      if (data.cascade?.status === 'success') {
        const keys = data.cascade.updatedAssumptions
          .filter((c) => c.key !== assumption?.key)
          .map((c) => c.key);
        onCascadeComplete(keys);
      }
    },
  });

  const handleValueChange = useCallback((newValue: string | null) => {
    if (!assumption) return;

    // Warn if editing a calculated value (breaks formula link)
    if (assumption.formula && assumption.confidence === 'CALCULATED') {
      setShowFormulaWarning(true);
    }

    setPendingValue(newValue);
  }, [assumption]);

  const handleSave = useCallback(() => {
    if (!assumption || pendingValue === null) return;

    updateMutation.mutate({
      id: assumption.id,
      projectId: assumption.projectId,
      value: pendingValue,
      confidence: assumption.formula && showFormulaWarning ? 'USER' : undefined,
    });
  }, [assumption, pendingValue, showFormulaWarning, updateMutation]);

  const handleConfidenceChange = useCallback((confidence: AssumptionConfidence) => {
    if (!assumption) return;
    updateMutation.mutate({
      id: assumption.id,
      projectId: assumption.projectId,
      confidence,
    });
  }, [assumption, updateMutation]);

  const handleSourceChange = useCallback((source: string) => {
    if (!assumption) return;
    updateMutation.mutate({
      id: assumption.id,
      projectId: assumption.projectId,
      source,
    });
  }, [assumption, updateMutation]);

  if (!assumption) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground text-center">
          Select an assumption to view details and edit its value.
        </p>
      </div>
    );
  }

  const deps = assumption.dependsOn.length > 0
    ? allAssumptions.filter((a) => assumption.dependsOn.includes(a.key))
    : [];

  const dependents = allAssumptions.filter((a) => a.dependsOn.includes(assumption.key));
  const hasChanges = pendingValue !== null && pendingValue !== assumption.value;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {assumption.name}
          </h3>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
            {assumption.key}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Value editor */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Value
          </label>
          <ValueEditor
            value={pendingValue ?? assumption.value}
            valueType={assumption.valueType}
            unit={assumption.unit}
            onChange={handleValueChange}
            disabled={updateMutation.isPending}
          />
        </div>

        {/* Formula warning */}
        {showFormulaWarning && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-500 font-medium">
                  Editing a calculated value
                </p>
                <p className="text-[11px] text-amber-500/70 mt-0.5">
                  This will override the formula and set confidence to &quot;User-set&quot;.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cascade preview */}
        {hasChanges && (
          <CascadePreview
            result={cascadePreview}
            isLoading={cascadeQuery.isFetching}
          />
        )}

        {/* Save / Cancel */}
        {hasChanges && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingValue(null);
                setCascadePreview(null);
                setShowFormulaWarning(false);
              }}
              className="rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Confidence */}
        {!assumption.formula && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Confidence
            </label>
            <div className="flex gap-1.5">
              {CONFIDENCE_OPTIONS.map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleConfidenceChange(value)}
                  disabled={updateMutation.isPending}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                    transition-colors duration-100 border
                    ${assumption.confidence === value
                      ? 'border-foreground/20 bg-foreground/5 text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Source */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Source
          </label>
          <input
            type="text"
            defaultValue={assumption.source}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && val !== assumption.source) {
                handleSourceChange(val);
              }
            }}
            placeholder="Where does this number come from?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs
              placeholder:text-muted-foreground/40
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
          {assumption.sourceUrl && (
            <a
              href={assumption.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-primary hover:underline"
            >
              <Link2 className="w-3 h-3" />
              View source
            </a>
          )}
        </div>

        {/* Formula */}
        {assumption.formula && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Formula
            </label>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <code className="text-xs font-mono text-foreground/80">
                {assumption.formula}
              </code>
            </div>
          </div>
        )}

        {/* Dependencies (inputs) */}
        {deps.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              Depends on ({deps.length})
            </label>
            <div className="space-y-1">
              {deps.map((dep) => (
                <div key={dep.key} className="flex items-center justify-between text-xs">
                  <span className="text-foreground/80">{dep.name}</span>
                  <span className="font-mono text-muted-foreground text-[11px]">
                    {dep.value ?? '\u2014'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dependents (downstream) */}
        {dependents.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <GitBranch className="w-3 h-3 rotate-180" />
              Used by ({dependents.length})
            </label>
            <div className="space-y-1">
              {dependents.map((dep) => (
                <div key={dep.key} className="flex items-center justify-between text-xs">
                  <span className="text-foreground/80">{dep.name}</span>
                  <span className="font-mono text-muted-foreground text-[11px]">
                    {dep.value ?? '\u2014'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staleness info */}
        {assumption.staleness?.isStale && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-xs text-amber-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{assumption.staleness.reason}</span>
            </div>
            {assumption.staleness.daysSinceUpdate !== undefined && (
              <p className="text-[11px] text-amber-500/60 mt-1">
                Last updated {assumption.staleness.daysSinceUpdate} days ago
              </p>
            )}
          </div>
        )}

        {/* Required indicator */}
        {assumption.isRequired && assumption.value === null && (
          <div className="flex items-center gap-1.5 text-xs text-amber-500/80">
            <Info className="w-3 h-3" />
            Required for report generation
          </div>
        )}
      </div>
    </div>
  );
}

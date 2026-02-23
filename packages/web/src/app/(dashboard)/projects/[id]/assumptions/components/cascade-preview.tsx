'use client';

import { ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
import type { CascadeResult } from '@forge/shared';

interface CascadePreviewProps {
  result: CascadeResult | null;
  isLoading: boolean;
}

export function CascadePreview({ result, isLoading }: CascadePreviewProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Computing cascade...
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (result.status === 'error') {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="font-medium">Cascade error</span>
        </div>
        <p className="mt-1 text-xs text-destructive/80">{result.errorMessage}</p>
      </div>
    );
  }

  const changes = result.updatedAssumptions.filter(
    (c) => c.key !== result.changedKey
  );

  if (changes.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          No downstream assumptions will be affected.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <RefreshCw className="w-3 h-3 text-violet-400" />
        {changes.length} assumption{changes.length !== 1 ? 's' : ''} will recalculate
      </div>
      <div className="space-y-1">
        {changes.map((change) => (
          <div key={change.key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-[11px] text-foreground/70">{change.key}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
            <span className="font-mono text-[11px]">
              {change.oldValue ?? '\u2014'}
            </span>
            <ArrowRight className="w-3 h-3 text-primary" />
            <span className="font-mono text-[11px] text-foreground font-medium">
              {change.newValue === 'null' ? '\u2014' : change.newValue}
            </span>
          </div>
        ))}
      </div>

      {result.impactedSections.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            {result.impactedSections.length} report section{result.impactedSections.length !== 1 ? 's' : ''} impacted
          </p>
        </div>
      )}
    </div>
  );
}

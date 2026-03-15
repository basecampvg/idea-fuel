'use client';

import type { DemandMiningResult } from '@forge/shared';
import { Activity } from 'lucide-react';

const STRENGTH_COLORS: Record<string, string> = {
  strong: 'bg-emerald-500/15 text-emerald-400',
  moderate: 'bg-amber-500/15 text-amber-400',
  weak: 'bg-zinc-500/15 text-zinc-400',
};

export function DemandMiningSection({ data }: { data: DemandMiningResult }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-card border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Demand Mining</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
      </div>

      {/* Demand Signals */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Demand Signals</h3>
        <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[minmax(0,5fr)_minmax(0,3fr)_80px_minmax(0,2fr)] gap-4 px-4 py-2 bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <span>Signal</span>
            <span>Segment</span>
            <span>Strength</span>
            <span>Source</span>
          </div>

          {data.demandSignals.map((signal, i) => (
            <div key={i} className="border-t border-border/30">
              {/* Desktop: table row */}
              <div className="hidden md:grid grid-cols-[minmax(0,5fr)_minmax(0,3fr)_80px_minmax(0,2fr)] gap-4 px-4 py-3 items-start">
                <div className="min-w-0">
                  <div className="text-sm leading-snug">{signal.signal}</div>
                  {signal.relatedProducts.length > 0 && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {signal.relatedProducts.map((p, j) => (
                        <span key={j} className="px-2 py-0.5 rounded-md bg-muted/50 text-[10px] text-muted-foreground leading-tight">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground leading-snug pt-0.5">{signal.customerSegment}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold w-fit ${STRENGTH_COLORS[signal.strength] || ''}`}>
                  {signal.strength}
                </span>
                <span className="text-xs text-muted-foreground leading-snug pt-0.5">{signal.source}</span>
              </div>

              {/* Mobile: stacked card */}
              <div className="md:hidden px-4 py-3 space-y-2">
                <div className="text-sm leading-snug">{signal.signal}</div>
                {signal.relatedProducts.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {signal.relatedProducts.map((p, j) => (
                      <span key={j} className="px-2 py-0.5 rounded-md bg-muted/50 text-[10px] text-muted-foreground">{p}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-muted-foreground flex-1">{signal.customerSegment}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STRENGTH_COLORS[signal.strength] || ''}`}>
                    {signal.strength}
                  </span>
                  <span className="text-xs text-muted-foreground">{signal.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Underserved Segments */}
      {data.underservedSegments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Underserved Segments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.underservedSegments.map((seg, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
                <h4 className="text-sm font-medium mb-1">{seg.segment}</h4>
                <div className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium text-foreground">Willingness:</span> {seg.willingness}
                </div>

                {seg.painPoints.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Pain Points</div>
                    <ul className="space-y-0.5">
                      {seg.painPoints.map((p, j) => (
                        <li key={j} className="text-xs text-muted-foreground">- {p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {seg.evidence.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Evidence</div>
                    <ul className="space-y-0.5">
                      {seg.evidence.map((e, j) => (
                        <li key={j} className="text-xs text-muted-foreground">- {e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import type { AdjacencyScanResult } from '@forge/shared';
import { Map } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  customer: 'bg-blue-500/15 text-blue-400',
  capability: 'bg-purple-500/15 text-purple-400',
  channel: 'bg-cyan-500/15 text-cyan-400',
  product: 'bg-emerald-500/15 text-emerald-400',
  geographic: 'bg-amber-500/15 text-amber-400',
};

const EFFORT_COLORS: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-400',
  medium: 'bg-amber-500/15 text-amber-400',
  high: 'bg-red-500/15 text-red-400',
};

export function AdjacencyScanSection({ data }: { data: AdjacencyScanResult }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-card border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Map className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Adjacency Scan</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {data.totalIdentified} adjacencies identified
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{data.summary}</p>
      </div>

      {/* Adjacency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.adjacencies.map((adj) => (
          <div key={adj.id} className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold flex-1">{adj.title}</h3>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[adj.adjacencyType] || 'bg-muted text-muted-foreground'}`}>
                {adj.adjacencyType}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${EFFORT_COLORS[adj.estimatedEffort] || ''}`}>
                {adj.estimatedEffort} effort
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-3">{adj.description}</p>

            {/* Relevance Score */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-muted-foreground">Relevance</span>
              <div className="flex-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${adj.relevanceScore}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground w-7 text-right">{adj.relevanceScore}</span>
            </div>

            {/* Evidence */}
            {adj.evidence.length > 0 && (
              <div className="mb-2">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Evidence</div>
                <ul className="space-y-0.5">
                  {adj.evidence.map((e, i) => (
                    <li key={i} className="text-xs text-muted-foreground">- {e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Market Signals */}
            {adj.marketSignals.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Market Signals</div>
                <div className="flex flex-wrap gap-1">
                  {adj.marketSignals.map((s, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-muted/50 text-[10px] text-muted-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

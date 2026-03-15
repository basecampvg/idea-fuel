'use client';

import type { CompetitorPortfolioResult } from '@forge/shared';
import { Eye } from 'lucide-react';

export function CompetitorPortfolioSection({ data }: { data: CompetitorPortfolioResult }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-card border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Competitor Portfolio</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {data.competitors.length} competitors mapped
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{data.summary}</p>
      </div>

      {/* Competitor Cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Competitors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.competitors.map((comp, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold">{comp.name}</h4>
                {comp.estimatedRevenue && (
                  <span className="ml-auto text-[10px] text-muted-foreground">{comp.estimatedRevenue}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{comp.marketPosition}</p>

              {comp.productLines.length > 0 && (
                <div className="mb-2">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Product Lines</div>
                  <div className="flex flex-wrap gap-1">
                    {comp.productLines.map((p, j) => (
                      <span key={j} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[10px] text-blue-400">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {comp.recentExpansions.length > 0 && (
                <div className="mb-2">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Recent Expansions</div>
                  <ul className="space-y-0.5">
                    {comp.recentExpansions.map((e, j) => (
                      <li key={j} className="text-xs text-muted-foreground">- {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {comp.gaps.length > 0 && (
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Gaps</div>
                  <ul className="space-y-0.5">
                    {comp.gaps.map((g, j) => (
                      <li key={j} className="text-xs text-emerald-400/80">- {g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* White Spaces */}
      {data.whiteSpaces.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">White Spaces</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.whiteSpaces.map((ws, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-emerald-500/20">
                <h4 className="text-sm font-medium mb-1">{ws.description}</h4>
                <div className="text-xs text-muted-foreground mb-2">
                  {ws.competitorCount === 0
                    ? 'No competitors in this space'
                    : `${ws.competitorCount} competitor${ws.competitorCount > 1 ? 's' : ''} nearby`}
                </div>
                {ws.demandEvidence.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Demand Evidence</div>
                    <ul className="space-y-0.5">
                      {ws.demandEvidence.map((e, j) => (
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

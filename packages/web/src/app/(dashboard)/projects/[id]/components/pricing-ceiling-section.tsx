'use client';

import type { PricingCeilingResult } from '@forge/shared';
import { DollarSign } from 'lucide-react';

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-emerald-500/15 text-emerald-400',
  medium: 'bg-amber-500/15 text-amber-400',
  low: 'bg-zinc-500/15 text-zinc-400',
};

export function PricingCeilingSection({ data }: { data: PricingCeilingResult }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-card border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Pricing Ceiling</h2>
        </div>
        <p className="text-sm text-muted-foreground">{data.summary}</p>
      </div>

      {/* Pricing Benchmarks */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Pricing Benchmarks</h3>
        <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <span>Category</span>
            <span>Low</span>
            <span>Mid</span>
            <span>High</span>
            <span>Basis</span>
          </div>
          {data.pricingBenchmarks.map((bench, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-3 border-t border-border/30 items-center">
              <span className="text-sm">{bench.productCategory}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {bench.currency}{bench.lowEnd.toLocaleString()}
              </span>
              <span className="text-xs tabular-nums font-medium">
                {bench.currency}{bench.midRange.toLocaleString()}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {bench.currency}{bench.highEnd.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">{bench.basis}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Power */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Pricing Power</h3>
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Current Position</div>
              <p className="text-sm">{data.pricingPower.currentPosition}</p>
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Headroom</div>
              <p className="text-sm">{data.pricingPower.headroom}</p>
            </div>
          </div>

          {data.pricingPower.factors.length > 0 && (
            <div className="mb-2">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Factors</div>
              <ul className="space-y-0.5">
                {data.pricingPower.factors.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground">- {f}</li>
                ))}
              </ul>
            </div>
          )}

          {data.pricingPower.risks.length > 0 && (
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Risks</div>
              <ul className="space-y-0.5">
                {data.pricingPower.risks.map((r, i) => (
                  <li key={i} className="text-xs text-red-400/80">- {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Revenue Projections */}
      {data.revenueProjections.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Revenue Projections</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.revenueProjections.map((proj, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-medium">{proj.scenario}</h4>
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold ${CONFIDENCE_COLORS[proj.confidence] || ''}`}>
                    {proj.confidence}
                  </span>
                </div>
                <div className="text-lg font-semibold text-primary mb-2">{proj.annualRevenue}</div>
                {proj.assumptions.length > 0 && (
                  <ul className="space-y-0.5">
                    {proj.assumptions.map((a, j) => (
                      <li key={j} className="text-[11px] text-muted-foreground">- {a}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface Metric {
  label: string;
  value: string | number | null;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface DerivedMetricsStripProps {
  metrics: Metric[];
}

function formatMetric(value: string | number | null, unit?: string): string {
  if (value === null || value === undefined) return '\u2014';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return String(value);

  if (unit === '$') {
    if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${Math.round(num).toLocaleString()}`;
  }
  if (unit === '%') return `${num.toFixed(1)}%`;
  if (unit === 'x') return `${num.toFixed(1)}x`;
  if (unit === 'months') {
    if (!Number.isFinite(num)) return 'N/A';
    return `${Math.round(num)}mo`;
  }
  return num.toLocaleString();
}

export function DerivedMetricsStrip({ metrics }: DerivedMetricsStripProps) {
  if (metrics.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/50 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Derived Metrics
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 font-medium">{m.label}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-mono font-semibold text-foreground">
                {formatMetric(m.value, m.unit)}
              </span>
              {m.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
              {m.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

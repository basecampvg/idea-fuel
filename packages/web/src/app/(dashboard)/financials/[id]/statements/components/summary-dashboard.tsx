'use client';

import { useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Flame,
  Clock,
} from 'lucide-react';

interface StatementLine {
  key: string;
  name: string;
  values: number[];
  isSubtotal?: boolean;
  isTotal?: boolean;
}

interface StatementData {
  type: string;
  lines: StatementLine[];
  periods: string[];
}

interface SummaryDashboardProps {
  pl: StatementData;
  bs: StatementData;
  cf: StatementData;
}

function findLine(statement: StatementData, key: string): StatementLine | undefined {
  return statement.lines.find((l) => l.key === key);
}

function lastValue(line: StatementLine | undefined): number {
  if (!line || line.values.length === 0) return 0;
  return line.values[line.values.length - 1];
}

function firstYearTotal(line: StatementLine | undefined): number {
  if (!line) return 0;
  // Sum first 12 periods (monthly Y1)
  return line.values.slice(0, 12).reduce((sum, v) => sum + v, 0);
}

function formatLargeCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

interface MetricCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ label, value, subtext, icon, trend }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground/60 font-medium">{label}</span>
        <div className="p-1.5 rounded-lg bg-primary/5 text-primary">{icon}</div>
      </div>
      <div className="text-xl font-semibold text-foreground font-mono tabular-nums">{value}</div>
      <div className={`mt-1 text-xs ${
        trend === 'up' ? 'text-emerald-400' :
        trend === 'down' ? 'text-red-400' :
        'text-muted-foreground/50'
      }`}>
        {subtext}
      </div>
    </div>
  );
}

export function SummaryDashboard({ pl, bs, cf }: SummaryDashboardProps) {
  const metrics = useMemo(() => {
    const revenue = findLine(pl, 'total_revenue') ?? findLine(pl, 'revenue');
    const netIncome = findLine(pl, 'net_income');
    const cashLine = findLine(bs, 'cash') ?? findLine(cf, 'ending_cash');
    const netCashChange = findLine(cf, 'net_cash_change');

    const y1Revenue = firstYearTotal(revenue);
    const lastRevenue = lastValue(revenue);
    const y1NetIncome = firstYearTotal(netIncome);
    const lastCash = lastValue(cashLine);

    // Monthly burn rate: average negative net cash over first 12 months
    const first12Cash = netCashChange?.values.slice(0, 12) ?? [];
    const negativeMonths = first12Cash.filter((v) => v < 0);
    const burnRate = negativeMonths.length > 0
      ? Math.abs(negativeMonths.reduce((s, v) => s + v, 0) / negativeMonths.length)
      : 0;

    // Runway: months of cash at current burn rate
    const runway = burnRate > 0 ? Math.round(lastCash / burnRate) : 999;

    // Net margin
    const margin = y1Revenue > 0 ? (y1NetIncome / y1Revenue) * 100 : 0;

    return { y1Revenue, lastRevenue, y1NetIncome, lastCash, burnRate, runway, margin };
  }, [pl, bs, cf]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <MetricCard
        label="Year 1 Revenue"
        value={formatLargeCurrency(metrics.y1Revenue)}
        subtext={`Last period: ${formatLargeCurrency(metrics.lastRevenue)}`}
        icon={<DollarSign className="w-4 h-4" />}
        trend={metrics.y1Revenue > 0 ? 'up' : 'neutral'}
      />
      <MetricCard
        label="Year 1 Net Income"
        value={formatLargeCurrency(metrics.y1NetIncome)}
        subtext={`${metrics.margin >= 0 ? '+' : ''}${metrics.margin.toFixed(1)}% margin`}
        icon={metrics.y1NetIncome >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        trend={metrics.y1NetIncome >= 0 ? 'up' : 'down'}
      />
      <MetricCard
        label="Cash Balance"
        value={formatLargeCurrency(metrics.lastCash)}
        subtext="End of forecast"
        icon={<Wallet className="w-4 h-4" />}
        trend={metrics.lastCash > 0 ? 'up' : 'down'}
      />
      <MetricCard
        label="Monthly Burn"
        value={metrics.burnRate > 0 ? formatLargeCurrency(metrics.burnRate) : 'N/A'}
        subtext={metrics.burnRate > 0 ? 'Avg Y1 monthly burn' : 'Cash flow positive'}
        icon={<Flame className="w-4 h-4" />}
        trend={metrics.burnRate > 0 ? 'down' : 'up'}
      />
      <MetricCard
        label="Runway"
        value={metrics.runway >= 999 ? '∞' : `${metrics.runway} mo`}
        subtext={metrics.runway >= 999 ? 'Self-sustaining' : 'At current burn rate'}
        icon={<Clock className="w-4 h-4" />}
        trend={metrics.runway >= 24 ? 'up' : metrics.runway >= 12 ? 'neutral' : 'down'}
      />
    </div>
  );
}

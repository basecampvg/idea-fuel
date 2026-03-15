'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface StatementData {
  type: string;
  lines: Array<{
    key: string;
    name: string;
    values: number[];
    isSubtotal?: boolean;
    isTotal?: boolean;
  }>;
  periods: string[];
}

interface ImpactChartProps {
  statements: {
    pl: StatementData;
    bs: StatementData;
    cf: StatementData;
  } | null;
}

const CHART_COLORS = {
  revenue: '#22c55e',
  costs: '#ef4444',
  net_income: '#3b82f6',
  cash: '#f59e0b',
};

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

export function ImpactChart({ statements }: ImpactChartProps) {
  const chartData = useMemo(() => {
    if (!statements) return [];

    const { pl, cf } = statements;
    const revLine = pl.lines.find(l => l.key === 'revenue' || l.key === 'subscription_revenue');
    const cogsLine = pl.lines.find(l => l.key === 'cogs');
    const opexLine = pl.lines.find(l => l.key === 'total_opex');
    const netIncomeLine = pl.lines.find(l => l.key === 'net_income');
    const cashLine = cf.lines.find(l => l.key === 'ending_cash');

    return pl.periods.map((period, i) => ({
      period: period.replace('Y1-', '').replace('Y2-', 'Y2 '),
      revenue: revLine?.values[i] ?? 0,
      costs: -((cogsLine?.values[i] ?? 0) + (opexLine?.values[i] ?? 0)),
      net_income: netIncomeLine?.values[i] ?? 0,
      cash: cashLine?.values[i] ?? 0,
    }));
  }, [statements]);

  if (!statements || chartData.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
        <p className="text-xs text-muted-foreground/50">
          Enable modules and add assumptions to see projections
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
        <h3 className="text-xs font-semibold text-foreground">Monthly Projections</h3>
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
          How your assumptions impact revenue, costs, and cash over time
        </p>
      </div>
      <div className="p-4" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradNetIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.net_income} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.net_income} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.cash} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.cash} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ fontSize: 10, color: 'var(--muted-foreground)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10 }}
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={CHART_COLORS.revenue}
              fill="url(#gradRevenue)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="net_income"
              name="Net Income"
              stroke={CHART_COLORS.net_income}
              fill="url(#gradNetIncome)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cash"
              name="Cash Balance"
              stroke={CHART_COLORS.cash}
              fill="url(#gradCash)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

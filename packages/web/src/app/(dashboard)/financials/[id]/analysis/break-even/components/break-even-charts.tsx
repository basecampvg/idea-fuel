'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

interface ChartData {
  month: string;
  revenue: number;
  costs: number;
  cumProfit: number;
}

interface BreakEvenChartsProps {
  chartData: ChartData[];
  breakEvenMonth: number;
  notAchievable: boolean;
}

export function BreakEvenCharts({ chartData, breakEvenMonth, notAchievable }: BreakEvenChartsProps) {
  return (
    <>
      {/* Revenue vs Costs Chart */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Revenue vs Total Costs (36 months)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(v: number) => formatCurrency(v)}
                tickLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fill="url(#revGrad)"
                strokeWidth={2}
                name="Revenue"
              />
              <Area
                type="monotone"
                dataKey="costs"
                stroke="#f87171"
                fill="url(#costGrad)"
                strokeWidth={2}
                name="Total Costs"
              />
              {!notAchievable && (
                <ReferenceLine
                  x={`M${breakEvenMonth}`}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="4 4"
                  label={{ value: 'Break-even', fill: 'hsl(var(--primary))', fontSize: 10 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cumulative P&L Chart */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Cumulative Profit / Loss</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(v: number) => formatCurrency(v)}
                tickLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" opacity={0.5} />
              <Area
                type="monotone"
                dataKey="cumProfit"
                stroke="#34d399"
                fill="url(#profitGrad)"
                strokeWidth={2}
                name="Cumulative P&L"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

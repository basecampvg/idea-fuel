'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

interface FinancialProjections {
  year1: { revenue: number; costs: number; profit: number };
  year2: { revenue: number; costs: number; profit: number };
  year3: { revenue: number; costs: number; profit: number };
  breakEvenMonth: number;
  assumptions: string[];
}

interface FinancialChartProps {
  projections: FinancialProjections;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export function FinancialChart({ projections }: FinancialChartProps) {
  const chartData = [
    { name: 'Year 1', revenue: projections.year1.revenue, costs: projections.year1.costs, profit: projections.year1.profit },
    { name: 'Year 2', revenue: projections.year2.revenue, costs: projections.year2.costs, profit: projections.year2.profit },
    { name: 'Year 3', revenue: projections.year3.revenue, costs: projections.year3.costs, profit: projections.year3.profit },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {chartData.map((d) => (
          <div key={d.name} className="rounded-lg border border-border bg-card p-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">{d.name}</p>
            <p className="mt-1 font-display text-lg font-black text-foreground">{formatCurrency(d.revenue)}</p>
            <p className={`text-xs ${d.profit >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
              {d.profit >= 0 ? '+' : ''}{formatCurrency(d.profit)} profit
            </p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--chart-grid))" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'hsl(var(--chart-axis))', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--chart-axis))', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--chart-tooltip-bg))',
                borderColor: 'hsl(var(--chart-tooltip-border))',
                borderRadius: '8px',
                color: 'hsl(var(--chart-tooltip-text))',
              }}
              formatter={(value, name) => [formatCurrency((value as number) ?? 0), String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
            />
            <Legend />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
            <Bar dataKey="costs" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} name="Costs" />
            <Bar dataKey="profit" fill="hsl(var(--chart-stroke))" radius={[4, 4, 0, 0]} name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Break-even + assumptions */}
      <div className="flex items-center gap-3 text-sm">
        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium text-xs">
          Break-even: Month {projections.breakEvenMonth}
        </span>
      </div>

      {projections.assumptions.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">Key Assumptions</h4>
          <ul className="space-y-1">
            {projections.assumptions.map((a, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">-</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

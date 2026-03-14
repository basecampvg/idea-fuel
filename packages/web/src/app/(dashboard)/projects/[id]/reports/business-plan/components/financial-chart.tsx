'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

// ============================================================================
// Types
// ============================================================================

interface FinancialAssumption {
  key: string;
  name: string;
  value: number;
  unit: string | null;
  category: string;
  confidence: string;
}

interface MonthlyPLDataPoint {
  period: string;
  revenue: number;
  costs: number;
  profit: number;
}

interface FinancialProjections {
  year1: { revenue: number; costs: number; profit: number };
  year2: { revenue: number; costs: number; profit: number };
  year3: { revenue: number; costs: number; profit: number };
  breakEvenMonth: number;
  assumptions: string[];

  // Model-backed (optional)
  source?: 'model' | 'ai_estimate';
  modelId?: string;
  templateSlug?: string;
  richAssumptions?: FinancialAssumption[];
  monthlyPL?: MonthlyPLDataPoint[];
  breakEvenDetail?: {
    revenueModel: string;
    breakEvenPoint: number;
    breakEvenUnit: string;
    trajectory: Array<{
      month: number;
      revenue: number;
      totalCosts: number;
      profit: number;
      cumulativeProfit: number;
    }>;
  };
}

interface FinancialChartProps {
  projections: FinancialProjections;
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatAssumptionValue(value: number, unit: string | null): string {
  if (unit === '%' || unit === 'percent') return `${value}%`;
  if (unit === '$' || unit === 'USD' || unit === 'currency') return formatCurrency(value);
  if (unit === 'months') return `${value} mo`;
  return `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;
}

const CONFIDENCE_BADGES: Record<string, { label: string; className: string }> = {
  USER_PROVIDED: { label: 'Verified', className: 'bg-emerald-500/10 text-emerald-500' },
  INDUSTRY_BENCHMARK: { label: 'Benchmarked', className: 'bg-blue-500/10 text-blue-400' },
  AI_ESTIMATE: { label: 'Estimated', className: 'bg-amber-500/10 text-amber-400' },
  CALCULATED: { label: 'Calculated', className: 'bg-muted text-muted-foreground' },
};

const REVENUE_MODEL_LABELS: Record<string, string> = {
  subscription: 'SaaS / Subscription',
  unit: 'Unit Sales',
  services: 'Professional Services',
};

const CHART_STYLES = {
  grid: 'hsl(var(--chart-grid))',
  axis: 'hsl(var(--chart-axis))',
  tooltipBg: 'hsl(var(--chart-tooltip-bg))',
  tooltipBorder: 'hsl(var(--chart-tooltip-border))',
  tooltipText: 'hsl(var(--chart-tooltip-text))',
  primary: 'hsl(var(--primary))',
  primaryMuted: 'hsl(var(--primary) / 0.4)',
  stroke: 'hsl(var(--chart-stroke))',
  border: 'hsl(var(--border))',
};

// ============================================================================
// Sub-Components
// ============================================================================

function AnnualSummaryCards({ projections }: { projections: FinancialProjections }) {
  const chartData = [
    { name: 'Year 1', ...projections.year1 },
    { name: 'Year 2', ...projections.year2 },
    { name: 'Year 3', ...projections.year3 },
  ];

  return (
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
  );
}

function AnnualBarChart({ projections }: { projections: FinancialProjections }) {
  const chartData = [
    { name: 'Year 1', revenue: projections.year1.revenue, costs: projections.year1.costs, profit: projections.year1.profit },
    { name: 'Year 2', revenue: projections.year2.revenue, costs: projections.year2.costs, profit: projections.year2.profit },
    { name: 'Year 3', revenue: projections.year3.revenue, costs: projections.year3.costs, profit: projections.year3.profit },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={CHART_STYLES.grid} strokeDasharray="0" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: CHART_STYLES.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: CHART_STYLES.axis, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
          <Tooltip
            contentStyle={{ backgroundColor: CHART_STYLES.tooltipBg, borderColor: CHART_STYLES.tooltipBorder, borderRadius: '8px', color: CHART_STYLES.tooltipText }}
            formatter={(value, name) => [formatCurrency((value as number) ?? 0), String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
          />
          <Legend />
          <ReferenceLine y={0} stroke={CHART_STYLES.border} />
          <Bar dataKey="revenue" fill={CHART_STYLES.primary} radius={[4, 4, 0, 0]} name="Revenue" />
          <Bar dataKey="costs" fill={CHART_STYLES.primaryMuted} radius={[4, 4, 0, 0]} name="Costs" />
          <Bar dataKey="profit" fill={CHART_STYLES.stroke} radius={[4, 4, 0, 0]} name="Profit" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyPLChart({ data }: { data: MonthlyPLDataPoint[] }) {
  return (
    <div className="space-y-2">
      <h4 className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
        Revenue & Profit Trajectory
      </h4>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke={CHART_STYLES.grid} strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fill: CHART_STYLES.axis, fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fill: CHART_STYLES.axis, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
            <Tooltip
              contentStyle={{ backgroundColor: CHART_STYLES.tooltipBg, borderColor: CHART_STYLES.tooltipBorder, borderRadius: '8px', color: CHART_STYLES.tooltipText }}
              formatter={(value, name) => [formatCurrency((value as number) ?? 0), String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
            />
            <Legend />
            <ReferenceLine y={0} stroke={CHART_STYLES.border} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="revenue" stroke={CHART_STYLES.primary} strokeWidth={2} dot={false} name="Revenue" />
            <Line type="monotone" dataKey="costs" stroke={CHART_STYLES.primaryMuted} strokeWidth={2} dot={false} name="Costs" />
            <Line type="monotone" dataKey="profit" stroke={CHART_STYLES.stroke} strokeWidth={2} dot={false} name="Profit" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BreakEvenChart({ detail }: { detail: NonNullable<FinancialProjections['breakEvenDetail']> }) {
  // Show first 36 months of trajectory for readability
  const data = detail.trajectory.slice(0, 36);
  const beMonth = data.findIndex((d) => d.cumulativeProfit >= 0);

  return (
    <div className="space-y-2">
      <h4 className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
        Cumulative Profit Trajectory
      </h4>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke={CHART_STYLES.grid} strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: CHART_STYLES.axis, fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `M${v}`}
            />
            <YAxis tick={{ fill: CHART_STYLES.axis, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
            <Tooltip
              contentStyle={{ backgroundColor: CHART_STYLES.tooltipBg, borderColor: CHART_STYLES.tooltipBorder, borderRadius: '8px', color: CHART_STYLES.tooltipText }}
              formatter={(value) => [formatCurrency((value as number) ?? 0), 'Cumulative Profit']}
              labelFormatter={(label) => `Month ${label}`}
            />
            <ReferenceLine y={0} stroke={CHART_STYLES.border} strokeDasharray="4 4" />
            {beMonth >= 0 && (
              <ReferenceLine
                x={data[beMonth].month}
                stroke="hsl(var(--chart-stroke))"
                strokeDasharray="4 4"
                label={{ value: 'Break-even', position: 'top', fill: CHART_STYLES.axis, fontSize: 10 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="cumulativeProfit"
              stroke={CHART_STYLES.primary}
              fill={CHART_STYLES.primaryMuted}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RichAssumptions({ assumptions }: { assumptions: FinancialAssumption[] }) {
  // Group by category
  const grouped: Record<string, FinancialAssumption[]> = {};
  for (const a of assumptions) {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  }

  const categoryLabels: Record<string, string> = {
    PRICING: 'Pricing',
    ACQUISITION: 'Acquisition',
    RETENTION: 'Retention',
    MARKET: 'Market',
    COSTS: 'Costs',
    FUNDING: 'Funding',
    TIMELINE: 'Timeline',
    REVENUE: 'Revenue',
  };

  return (
    <div className="space-y-3">
      <h4 className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
        Model Assumptions
      </h4>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1">
            {categoryLabels[category] ?? category}
          </p>
          <div className="space-y-0.5">
            {items.map((a) => {
              const badge = CONFIDENCE_BADGES[a.confidence] ?? CONFIDENCE_BADGES.AI_ESTIMATE;
              return (
                <div key={a.key} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-muted-foreground">{a.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {formatAssumptionValue(a.value, a.unit)}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SimpleAssumptions({ assumptions }: { assumptions: string[] }) {
  if (assumptions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h4 className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">Key Assumptions</h4>
      <ul className="space-y-1">
        {assumptions.map((a, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-0.5">-</span>
            <span>{a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FinancialChart({ projections }: FinancialChartProps) {
  const isModelBacked = projections.source === 'model';

  return (
    <div className="space-y-4">
      {/* Annual summary cards */}
      <AnnualSummaryCards projections={projections} />

      {/* Annual bar chart (always shown) */}
      <AnnualBarChart projections={projections} />

      {/* Monthly P&L trajectory (model-backed only) */}
      {isModelBacked && projections.monthlyPL && projections.monthlyPL.length > 0 && (
        <MonthlyPLChart data={projections.monthlyPL} />
      )}

      {/* Break-even badges */}
      <div className="flex items-center gap-3 text-sm flex-wrap">
        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium text-xs">
          {projections.breakEvenMonth === -1
            ? 'Break-even: Not reached'
            : `Break-even: Month ${projections.breakEvenMonth}`}
        </span>
        {isModelBacked && projections.breakEvenDetail && (
          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium text-xs">
            {REVENUE_MODEL_LABELS[projections.breakEvenDetail.revenueModel] ?? projections.breakEvenDetail.revenueModel}
          </span>
        )}
      </div>

      {/* Break-even trajectory chart (model-backed only) */}
      {isModelBacked && projections.breakEvenDetail && (
        <BreakEvenChart detail={projections.breakEvenDetail} />
      )}

      {/* Assumptions: rich (model-backed) or simple (AI-estimated) */}
      {isModelBacked && projections.richAssumptions && projections.richAssumptions.length > 0 ? (
        <RichAssumptions assumptions={projections.richAssumptions} />
      ) : (
        <SimpleAssumptions assumptions={projections.assumptions} />
      )}
    </div>
  );
}

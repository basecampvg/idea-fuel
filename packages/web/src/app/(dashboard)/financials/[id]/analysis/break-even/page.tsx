'use client';

import { use, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/spinner';
import { Target, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';

const BreakEvenCharts = dynamic(
  () => import('./components/break-even-charts').then((m) => m.BreakEvenCharts),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[300px] rounded-2xl border border-border bg-card">
        <Spinner size="lg" />
      </div>
    ),
  },
);

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function BreakEvenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: modelId } = use(params);

  const { data: model, isLoading: modelLoading } = trpc.financial.get.useQuery({ id: modelId });
  const baseScenarioId = model?.scenarios?.find((s) => s.isBase)?.id;

  const { data: result, isLoading: beLoading } = trpc.financial.computeBreakEven.useQuery(
    { scenarioId: baseScenarioId! },
    { enabled: !!baseScenarioId },
  );

  const isLoading = modelLoading || beLoading;

  // Prepare chart data (first 36 months for readability)
  const chartData = useMemo(() => {
    if (!result) return [];
    return result.trajectory.slice(0, 36).map((point) => ({
      month: `M${point.month}`,
      revenue: Math.round(point.revenue),
      costs: Math.round(point.totalCosts),
      cumProfit: Math.round(point.cumulativeProfit),
    }));
  }, [result]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-12 text-center">
        <Target className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No break-even data</h3>
        <p className="text-sm text-muted-foreground/60">
          Add assumptions to your model to compute break-even analysis.
        </p>
      </div>
    );
  }

  const notAchievable = result.breakEvenMonth === -1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Break-Even Analysis</h2>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full capitalize">
          {result.revenueModel}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground/60 font-medium">Break-Even Point</span>
          </div>
          <div className="text-xl font-semibold text-foreground font-mono tabular-nums">
            {result.breakEvenPoint === -1 ? 'N/A' : result.breakEvenPoint.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-muted-foreground/50">{result.breakEvenUnit}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground/60 font-medium">Month Reached</span>
          </div>
          <div className={`text-xl font-semibold font-mono tabular-nums ${
            notAchievable ? 'text-red-400' : 'text-emerald-400'
          }`}>
            {notAchievable ? 'Not reached' : `Month ${result.breakEvenMonth}`}
          </div>
          <div className="mt-1 text-xs text-muted-foreground/50">
            {notAchievable ? 'Within 60 months' : `~${Math.ceil(result.breakEvenMonth / 12)} year${result.breakEvenMonth > 12 ? 's' : ''}`}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground/60 font-medium">36-Month P&L</span>
          </div>
          <div className={`text-xl font-semibold font-mono tabular-nums ${
            (result.trajectory[35]?.cumulativeProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {formatCurrency(result.trajectory[35]?.cumulativeProfit ?? 0)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground/50">Cumulative profit/loss</div>
        </div>
      </div>

      {/* Warning if not achievable */}
      {notAchievable && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Break-even not achievable within 5 years</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Consider adjusting pricing, reducing fixed costs, or improving customer acquisition to reach profitability sooner.
            </p>
          </div>
        </div>
      )}

      {/* Charts (lazy-loaded — recharts is ~200KB) */}
      <BreakEvenCharts
        chartData={chartData}
        breakEvenMonth={result.breakEvenMonth}
        notAchievable={notAchievable}
      />
    </div>
  );
}

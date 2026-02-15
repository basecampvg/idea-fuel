'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SparkKeywordTrend } from '@forge/shared';

interface SparkKeywordChartProps {
  keywordTrends?: SparkKeywordTrend[] | null;
  title?: string;
  subtitle?: string;
}

// Calculate growth percentage from trend data
function calculateGrowth(trend: Array<{ date: string; value: number }>): number {
  if (!trend || trend.length < 2) return 0;

  // Get first non-zero value for comparison
  const firstValue = trend.find((t) => t.value > 0)?.value || trend[0].value;
  const lastValue = trend[trend.length - 1].value;

  if (firstValue === 0) {
    // If starting from 0 and now has value, it's emerging
    return lastValue > 0 ? 999 : 0;
  }

  const growth = ((lastValue - firstValue) / firstValue) * 100;
  return Math.round(growth);
}

// Format month/year from ISO date string
function formatDate(dateStr: string): { month: string; year: string; monthYear: string } {
  const date = new Date(dateStr);
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear().toString();
  return { month, year, monthYear: `${month} ${year}` };
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function SparkKeywordChart({
  keywordTrends,
  title,
  subtitle,
}: SparkKeywordChartProps) {
  const [isKeywordDropdownOpen, setIsKeywordDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Parse if needed
  const trends: SparkKeywordTrend[] | null = useMemo(() => {
    if (!keywordTrends) return null;
    if (typeof keywordTrends === 'string') {
      try {
        return JSON.parse(keywordTrends);
      } catch {
        return null;
      }
    }
    return Array.isArray(keywordTrends) ? keywordTrends : null;
  }, [keywordTrends]);

  // Show placeholder if no data
  if (!trends || trends.length === 0) {
    return (
      <div className="rounded-2xl bg-background border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Keyword:</span>
            <button className="flex items-center gap-1 text-sm text-foreground">
              <span>No data</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="h-72 flex items-center justify-center rounded-xl bg-card border border-border">
          <p className="text-muted-foreground">No keyword data available</p>
        </div>
      </div>
    );
  }

  const selectedTrend = trends[selectedIndex] || trends[0];

  // Calculate growth from actual trend data
  const growth = calculateGrowth(selectedTrend.trend);

  // Get average value as "volume" (0-100 interest score)
  const volume = selectedTrend.volume || Math.round(
    selectedTrend.trend.reduce((sum, t) => sum + t.value, 0) / selectedTrend.trend.length
  );

  // Transform trend data for chart with year tracking
  let lastShownYear = '';
  const chartData = selectedTrend.trend.map((point, index) => {
    const { month, year, monthYear } = formatDate(point.date);
    const date = new Date(point.date);
    const isFirstPoint = index === 0;
    const isJanuary = date.getMonth() === 0;
    const shouldShowYear = (isFirstPoint || isJanuary) && year !== lastShownYear;

    if (shouldShowYear) {
      lastShownYear = year;
    }

    return {
      index,
      date: point.date,
      value: point.value,
      month,
      year,
      monthYear,
      showLabel: shouldShowYear,
    };
  });

  // Get tick indices for X-axis (show years only)
  const tickIndices = chartData
    .map((d, i) => (d.showLabel ? i : null))
    .filter((i): i is number => i !== null);

  return (
    <div className="rounded-2xl bg-background border border-border p-6">
      {/* Title/Subtitle */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Left side: Keyword Dropdown + Timeframe */}
        <div className="flex items-center gap-4">
          {/* Keyword Dropdown */}
          <div className="flex items-center gap-2 relative">
            <span className="text-sm text-muted-foreground">Keyword:</span>
            <button
              onClick={() => setIsKeywordDropdownOpen(!isKeywordDropdownOpen)}
              className="flex items-center gap-1 text-sm text-foreground hover:text-muted-foreground transition-colors"
            >
              <span>{selectedTrend.keyword}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Keyword Dropdown menu */}
            {isKeywordDropdownOpen && trends.length > 1 && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg py-1 z-10 min-w-[200px]">
                {trends.map((kw, index) => (
                  <button
                    key={kw.keyword}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      index === selectedIndex
                        ? 'text-primary bg-muted'
                        : 'text-foreground hover:bg-muted'
                    }`}
                    onClick={() => {
                      setSelectedIndex(index);
                      setIsKeywordDropdownOpen(false);
                    }}
                  >
                    {kw.keyword}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeframe indicator (Spark is always 12 months) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground px-2 py-1 rounded-md border border-border">
              12 months
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-semibold tabular-nums">
              {formatNumber(volume)}
            </span>
            <span className="text-muted-foreground">Avg Interest</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold tabular-nums ${
                growth >= 500
                  ? 'text-primary' // Pink for emerging/new trends
                  : growth > 0
                  ? 'text-primary' // Positive growth
                  : growth < 0
                  ? 'text-[#ef4444]' // Red for negative growth
                  : 'text-muted-foreground' // Gray for no growth
              }`}
            >
              {growth >= 500
                ? '🚀 Emerging'
                : growth > 0
                ? `+${growth}%`
                : `${growth}%`}
            </span>
            <span className="text-muted-foreground">Growth</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {/* Gradient for area fill */}
              <linearGradient id="sparkPinkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-stroke))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--chart-stroke))" stopOpacity={0} />
              </linearGradient>
              {/* Glow filter for line */}
              <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid
              stroke="hsl(var(--chart-grid))"
              strokeDasharray="0"
              vertical={false}
            />
            <XAxis
              dataKey="index"
              tick={{ fill: 'hsl(var(--chart-axis))', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              ticks={tickIndices}
              tickFormatter={(index) => chartData[index]?.year || ''}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--chart-axis))', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={formatNumber}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--chart-tooltip-bg))',
                borderColor: 'hsl(var(--chart-tooltip-border))',
                borderRadius: '8px',
                color: 'hsl(var(--chart-tooltip-text))',
              }}
              labelStyle={{ color: 'hsl(var(--chart-axis))' }}
              labelFormatter={(index) => chartData[index as number]?.monthYear || ''}
              formatter={(value) => [value, 'Interest']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-stroke))"
              strokeWidth={2}
              fill="url(#sparkPinkGradient)"
              filter="url(#sparkGlow)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

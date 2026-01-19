'use client';

import { useState } from 'react';
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

export interface KeywordTrend {
  keyword: string;
  volume: number;
  growth: number; // percentage
  trend: number[]; // Up to 60 data points for chart (5 years monthly)
}

interface KeywordChartProps {
  keywordTrends?: KeywordTrend[] | null;
}

// Generate data with year info for X-axis display and tooltip
function getChartLabels(numMonths: number): { year: string; monthYear: string; showLabel: boolean }[] {
  const labels = [];
  const now = new Date();
  let lastShownYear = '';

  for (let i = numMonths - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear().toString();
    const month = date.toLocaleString('default', { month: 'short' });
    const monthYear = `${month} ${year}`;
    // Show year label on January or first data point (but not duplicates)
    const isFirstPoint = i === numMonths - 1;
    const isJanuary = date.getMonth() === 0;
    const shouldShow = (isFirstPoint || isJanuary) && year !== lastShownYear;

    if (shouldShow) {
      lastShownYear = year;
    }

    labels.push({ year, monthYear, showLabel: shouldShow });
  }
  return labels;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function KeywordChart({ keywordTrends: rawKeywordTrends }: KeywordChartProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Parse keywordTrends if it's a string (Prisma JSON field)
  let keywordTrends: KeywordTrend[] | null = null;
  if (rawKeywordTrends) {
    if (typeof rawKeywordTrends === 'string') {
      try {
        keywordTrends = JSON.parse(rawKeywordTrends);
      } catch {
        keywordTrends = null;
      }
    } else if (Array.isArray(rawKeywordTrends)) {
      keywordTrends = rawKeywordTrends;
    }
  }

  // Get selected keyword based on state
  const rawKeyword = keywordTrends?.[selectedIndex] || keywordTrends?.[0] || {
    keyword: 'No data',
    volume: 0,
    growth: 0,
    trend: Array(60).fill(0), // Default to 5 years (60 months)
  };

  // Cap trend data to last 60 months (5 years) for reasonable display
  const MAX_MONTHS = 60;
  const trendData = rawKeyword.trend.length > MAX_MONTHS
    ? rawKeyword.trend.slice(-MAX_MONTHS) // Take most recent data
    : rawKeyword.trend;

  const selectedKeyword = {
    ...rawKeyword,
    trend: trendData,
  };

  // Generate year labels based on actual data length
  const numDataPoints = selectedKeyword.trend.length;
  const chartLabels = getChartLabels(numDataPoints);

  // Transform trend data for chart
  const chartData = selectedKeyword.trend.map((value, index) => ({
    year: chartLabels[index]?.year || '',
    monthYear: chartLabels[index]?.monthYear || '',
    showLabel: chartLabels[index]?.showLabel || false,
    value,
    index,
  }));

  // Get indices where we should show year labels
  const tickIndices = chartData
    .map((d, i) => (d.showLabel ? i : null))
    .filter((i): i is number => i !== null);

  // Show placeholder if no data
  if (!keywordTrends || !Array.isArray(keywordTrends) || keywordTrends.length === 0) {
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

  return (
    <div className="rounded-2xl bg-background border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Keyword Dropdown */}
        <div className="flex items-center gap-2 relative">
          <span className="text-sm text-muted-foreground">Keyword:</span>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 text-sm text-foreground hover:text-muted-foreground transition-colors"
          >
            <span>{selectedKeyword.keyword}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && keywordTrends.length > 1 && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-[#2a2a38] rounded-lg py-1 z-10 min-w-[200px]">
              {keywordTrends.map((kw, index) => (
                <button
                  key={kw.keyword}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    index === selectedIndex
                      ? 'text-[#e91e8c] bg-[#22222e]'
                      : 'text-foreground hover:bg-[#22222e]'
                  }`}
                  onClick={() => {
                    setSelectedIndex(index);
                    setIsDropdownOpen(false);
                  }}
                >
                  {kw.keyword}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-semibold tabular-nums">
              {formatNumber(selectedKeyword.volume)}
            </span>
            <span className="text-muted-foreground">Volume</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold tabular-nums ${
                selectedKeyword.growth >= 500
                  ? 'text-[#e91e8c]' // Pink for emerging/new trends
                  : selectedKeyword.growth > 0
                  ? 'text-[#22c55e]' // Green for positive growth
                  : selectedKeyword.growth < 0
                  ? 'text-[#ef4444]' // Red for negative growth
                  : 'text-muted-foreground' // Gray for no growth
              }`}
            >
              {selectedKeyword.growth >= 500
                ? '🚀 Emerging'
                : selectedKeyword.growth > 0
                ? `+${selectedKeyword.growth}%`
                : `${selectedKeyword.growth}%`}
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
              <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e91e8c" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#e91e8c" stopOpacity={0} />
              </linearGradient>
              {/* Glow filter for line */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="0"
              vertical={false}
            />
            <XAxis
              dataKey="index"
              tick={{ fill: '#6a6a7a', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              ticks={tickIndices}
              tickFormatter={(index) => chartData[index]?.year || ''}
            />
            <YAxis
              tick={{ fill: '#6a6a7a', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatNumber}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(40 8% 9%)',
                borderColor: 'hsl(40 6% 18%)',
                borderRadius: '8px',
                color: '#ffffff',
              }}
              labelStyle={{ color: '#a0a0b0' }}
              labelFormatter={(index) => chartData[index as number]?.monthYear || ''}
              formatter={(value) => [formatNumber(value as number), 'Volume']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#e91e8c"
              strokeWidth={2}
              fill="url(#pinkGradient)"
              filter="url(#glow)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

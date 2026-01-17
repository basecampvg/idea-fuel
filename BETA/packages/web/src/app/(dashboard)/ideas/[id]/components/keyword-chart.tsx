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
  trend: number[]; // 12 data points for chart (monthly)
}

interface KeywordChartProps {
  keywordTrends?: KeywordTrend[] | null;
}

// Generate years for x-axis
const YEARS = ['2022', '2023', '2024', '2025'];

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function KeywordChart({ keywordTrends: rawKeywordTrends }: KeywordChartProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  // Get selected keyword (first one or default)
  const selectedKeyword = keywordTrends?.[0] || {
    keyword: 'Meal planning AI',
    volume: 12100,
    growth: 83,
    trend: [2000, 4000, 8000, 12000, 18000, 24000, 28000, 32000, 36000, 40000, 44000, 48000],
  };

  // Transform trend data for chart - expand to show years
  const chartData = selectedKeyword.trend.map((value, index) => {
    // Map 12 data points across 4 years (3 points per year)
    const yearIndex = Math.floor(index / 3);
    const year = YEARS[Math.min(yearIndex, YEARS.length - 1)];
    return {
      year,
      value,
      index,
    };
  });

  // Show placeholder if no data
  if (!keywordTrends || !Array.isArray(keywordTrends) || keywordTrends.length === 0) {
    return (
      <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6a6a7a]">Keyword:</span>
            <button className="flex items-center gap-1 text-sm text-white">
              <span>No data</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="h-56 flex items-center justify-center rounded-xl bg-[#1a1a24] border border-[#1e1e2a]">
          <p className="text-[#6a6a7a]">No keyword data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Keyword Dropdown */}
        <div className="flex items-center gap-2 relative">
          <span className="text-sm text-[#6a6a7a]">Keyword:</span>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 text-sm text-white hover:text-[#a0a0b0] transition-colors"
          >
            <span>{selectedKeyword.keyword}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && keywordTrends.length > 1 && (
            <div className="absolute top-full left-0 mt-1 bg-[#1a1a24] border border-[#2a2a38] rounded-lg py-1 z-10 min-w-[200px]">
              {keywordTrends.map((kw) => (
                <button
                  key={kw.keyword}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#22222e] transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
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
            <span className="text-white font-semibold tabular-nums">
              {formatNumber(selectedKeyword.volume)}
            </span>
            <span className="text-[#6a6a7a]">Volume</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#22c55e] font-semibold tabular-nums">
              +{selectedKeyword.growth}%
            </span>
            <span className="text-[#6a6a7a]">Growth</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 w-full">
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
              stroke="#1e1e2a"
              strokeDasharray="0"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={{ fill: '#6a6a7a', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6a6a7a', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatNumber}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a24',
                borderColor: '#2a2a38',
                borderRadius: '8px',
                color: '#ffffff',
              }}
              labelStyle={{ color: '#a0a0b0' }}
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

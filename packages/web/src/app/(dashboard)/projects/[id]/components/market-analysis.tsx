'use client';

import {
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Activity,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import { ProseBlock } from './ui/prose-block';
import { SparklineCard } from './ui/sparkline-card';

export interface MarketAnalysisData {
  size: string;
  growth: string;
  trends: string[];
  opportunities: string[];
  threats: string[];
  marketDynamics?: {
    stage: 'emerging' | 'growing' | 'mature' | 'declining';
    consolidationLevel: string;
    entryBarriers: string[];
    regulatoryEnvironment: string;
  };
  keyMetrics?: {
    cagr: string;
    avgDealSize: string;
    customerAcquisitionCost: string;
    lifetimeValue: string;
  };
  adjacentMarkets?: Array<{
    name: string;
    relevance: string;
    crossoverOpportunity: string;
  }>;
}

interface MarketAnalysisProps {
  marketAnalysis?: MarketAnalysisData | null;
  title?: string;
  subtitle?: string;
}

const stageBadgeColors: Record<string, string> = {
  emerging: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  growing: 'bg-primary/20 text-primary border-primary/30',
  mature: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  declining: 'bg-red-500/20 text-red-400 border-red-500/30',
};

/**
 * Wraps dollar amounts, percentages, and large numbers in highlighted spans
 * for inline stat emphasis within prose paragraphs.
 */
function highlightStats(text: string): React.ReactNode {
  // Match dollar amounts ($X.XX billion/million/etc), percentages (XX.X%), and
  // standalone large numbers that look like metrics
  const pattern = /(\$[\d,.]+\s*(?:billion|million|trillion|B|M|T|k)?|[\d,.]+%|\d{1,3}(?:,\d{3})+)/gi;
  const parts = text.split(pattern);
  // Use a separate non-global regex for testing to avoid lastIndex statefulness
  const testPattern = /^(\$[\d,.]+\s*(?:billion|million|trillion|B|M|T|k)?|[\d,.]+%|\d{1,3}(?:,\d{3})+)$/i;

  return parts.map((part, i) => {
    if (testPattern.test(part)) {
      return (
        <span
          key={i}
          className="font-mono font-semibold text-[13px] text-foreground"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * Computes simple horizontal bar widths from an array of segment objects.
 * Returns percentages relative to the largest value.
 */
function computeBarWidths(segments: Array<{ label: string; value: number }>) {
  const max = Math.max(...segments.map((s) => s.value), 1);
  return segments.map((s) => ({
    ...s,
    pct: Math.round((s.value / max) * 100),
  }));
}

/**
 * Extracts rough segment data from entry barriers for the bar chart.
 * Falls back to equal-weight display if no numeric data is available.
 */
function buildBarSegments(
  marketDynamics?: MarketAnalysisData['marketDynamics'],
  adjacentMarkets?: MarketAnalysisData['adjacentMarkets'],
) {
  // Prefer adjacent markets as bar chart data (more visually meaningful)
  if (adjacentMarkets && adjacentMarkets.length > 0) {
    return adjacentMarkets.map((m, i) => ({
      label: m.name,
      value: adjacentMarkets.length - i, // descending weight
    }));
  }
  // Fall back to entry barriers as categorical bars
  if (marketDynamics?.entryBarriers && marketDynamics.entryBarriers.length > 0) {
    return marketDynamics.entryBarriers.map((b, i) => ({
      label: b.length > 40 ? b.slice(0, 37) + '...' : b,
      value: marketDynamics.entryBarriers.length - i,
    }));
  }
  return [];
}

// Sparkline point presets for different trend directions
const ascendingPoints = [24, 22, 18, 16, 12, 10, 8, 6];
const descendingPoints = [6, 8, 10, 12, 16, 18, 22, 24];

function getSparkPoints(label: string): number[] {
  const lower = label.toLowerCase();
  if (lower.includes('cost') || lower.includes('cac')) return descendingPoints;
  if (lower.includes('ltv') || lower.includes('lifetime')) return ascendingPoints;
  if (lower.includes('cagr') || lower.includes('growth')) return ascendingPoints;
  return ascendingPoints;
}

function getTrendColor(label: string): 'green' | 'amber' | 'red' {
  const lower = label.toLowerCase();
  if (lower.includes('cost') || lower.includes('cac')) return 'amber';
  return 'green';
}

const barColors = [
  'bg-primary',
  'bg-primary/80',
  'bg-primary/60',
  'bg-primary/40',
  'bg-primary/30',
];

export function MarketAnalysis({
  marketAnalysis,
  title = 'Market Analysis',
  subtitle,
}: MarketAnalysisProps) {
  if (!marketAnalysis) return null;

  const barSegments = buildBarSegments(
    marketAnalysis.marketDynamics,
    marketAnalysis.adjacentMarkets,
  );
  const bars = computeBarWidths(barSegments);

  const metricsArray = marketAnalysis.keyMetrics
    ? [
        { label: 'CAGR', value: marketAnalysis.keyMetrics.cagr },
        { label: 'Avg Deal Size', value: marketAnalysis.keyMetrics.avgDealSize },
        { label: 'CAC', value: marketAnalysis.keyMetrics.customerAcquisitionCost },
        { label: 'LTV', value: marketAnalysis.keyMetrics.lifetimeValue },
      ].filter((m) => m.value)
    : [];

  const dynamicsBody = marketAnalysis.marketDynamics
    ? [
        marketAnalysis.marketDynamics.consolidationLevel,
        marketAnalysis.marketDynamics.regulatoryEnvironment,
      ]
        .filter(Boolean)
        .join('. ')
    : null;

  return (
    <CollapsibleSection
      icon={<BarChart3 className="w-5 h-5 text-accent" />}
      iconBgColor="hsl(var(--accent) / 0.15)"
      title={title}
      subtitle={subtitle}
    >
      <div>
        {/* 1. Market Size prose */}
        {marketAnalysis.size && (
          <ProseBlock
            label="Market Size"
            icon={<BarChart3 className="w-3.5 h-3.5" />}
          >
            {highlightStats(marketAnalysis.size)}
          </ProseBlock>
        )}

        {/* 2. Market Growth prose */}
        {marketAnalysis.growth && (
          <ProseBlock
            label="Market Growth"
            icon={<TrendingUp className="w-3.5 h-3.5" />}
          >
            {highlightStats(marketAnalysis.growth)}
          </ProseBlock>
        )}

        {/* 3. Bar chart card */}
        {bars.length > 0 && (
          <div className="rounded-xl bg-card border border-border p-4 mb-6">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono mb-3">
              {marketAnalysis.adjacentMarkets && marketAnalysis.adjacentMarkets.length > 0
                ? 'Adjacent Markets'
                : 'Entry Barriers'}
            </div>
            <div className="space-y-2.5">
              {bars.map((bar, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground truncate max-w-[70%]">
                      {bar.label}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-foreground/70">
                      {bar.pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColors[i % barColors.length]}`}
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Show crossover opportunities for adjacent markets */}
            {marketAnalysis.adjacentMarkets && marketAnalysis.adjacentMarkets.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                {marketAnalysis.adjacentMarkets.map((m, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />
                    <span>
                      <span className="font-medium text-foreground/80">{m.name}:</span>{' '}
                      {m.crossoverOpportunity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. SparklineCard grid */}
        {metricsArray.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {metricsArray.map((metric) => (
              <SparklineCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                trend="Overall"
                trendColor={getTrendColor(metric.label)}
                sparkPoints={getSparkPoints(metric.label)}
              />
            ))}
          </div>
        )}

        {/* 5. Market Dynamics prose */}
        {marketAnalysis.marketDynamics && dynamicsBody && (
          <ProseBlock
            label="Market Dynamics"
            icon={<Activity className="w-3.5 h-3.5" />}
            badge={
              <span
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${stageBadgeColors[marketAnalysis.marketDynamics.stage] || 'bg-muted text-muted-foreground border-border'}`}
              >
                {marketAnalysis.marketDynamics.stage.charAt(0).toUpperCase() +
                  marketAnalysis.marketDynamics.stage.slice(1)}
              </span>
            }
          >
            <span className="italic">{dynamicsBody}</span>
          </ProseBlock>
        )}

        {/* 6. Trends list */}
        {marketAnalysis.trends && marketAnalysis.trends.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-muted-foreground font-mono mb-2">
              Trends
            </div>
            <ul className="space-y-1.5 mb-6">
              {marketAnalysis.trends.map((trend, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/60" />
                  <span>{trend}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 7. Two-col Opportunities / Threats */}
        {((marketAnalysis.opportunities && marketAnalysis.opportunities.length > 0) ||
          (marketAnalysis.threats && marketAnalysis.threats.length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opportunities */}
            {marketAnalysis.opportunities && marketAnalysis.opportunities.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-muted-foreground font-mono mb-2">
                  Opportunities
                </div>
                <ul className="space-y-1.5">
                  {marketAnalysis.opportunities.map((opp, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Threats */}
            {marketAnalysis.threats && marketAnalysis.threats.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-muted-foreground font-mono mb-2">
                  Threats
                </div>
                <ul className="space-y-1.5">
                  {marketAnalysis.threats.map((threat, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                      <span>{threat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

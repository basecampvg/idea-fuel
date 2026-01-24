'use client';

import { useState } from 'react';
import { PieChart, TrendingUp, ChevronDown, ExternalLink, AlertCircle } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import type {
  MarketSizingData,
  MarketMetric,
  MarketSegmentBreakdown,
  MarketAssumption,
  MarketSource,
} from '@forge/shared';

interface MarketSizingProps {
  marketSizing?: MarketSizingData | null;
  title?: string;
  subtitle?: string;
}

// Confidence indicator colors
function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'bg-[#22c55e]';
    case 'medium':
      return 'bg-[#f59e0b]';
    case 'low':
      return 'bg-[#ef4444]';
  }
}

function getConfidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
      return 'Low confidence';
  }
}

// Card styling for each market level
const cardStyles: Record<string, { gradient: string; border: string; accent: string }> = {
  tam: {
    gradient: 'from-[#3b82f6]/20 to-[#3b82f6]/5',
    border: 'border-[#3b82f6]/30',
    accent: '#3b82f6',
  },
  sam: {
    gradient: 'from-[#8b5cf6]/20 to-[#8b5cf6]/5',
    border: 'border-[#8b5cf6]/30',
    accent: '#8b5cf6',
  },
  som: {
    gradient: 'from-[#22c55e]/20 to-[#22c55e]/5',
    border: 'border-[#22c55e]/30',
    accent: '#22c55e',
  },
};

const cardDescriptions: Record<string, string> = {
  tam: 'Total Addressable Market - everyone who could potentially use this',
  sam: 'Serviceable Available Market - your target segment',
  som: 'Serviceable Obtainable Market - realistic capture in 3-5 years',
};

function MarketCard({
  type,
  metric,
  label,
}: {
  type: 'tam' | 'sam' | 'som';
  metric: MarketMetric;
  label: string;
}) {
  const styles = cardStyles[type];
  const description = cardDescriptions[type];

  return (
    <div
      className={`p-5 rounded-xl bg-gradient-to-b ${styles.gradient} border ${styles.border} transition-all duration-200 hover:scale-[1.02]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div
          className={`w-2 h-2 rounded-full ${getConfidenceColor(metric.confidence)}`}
          title={getConfidenceLabel(metric.confidence)}
        />
      </div>

      {/* Value */}
      <div className="text-2xl font-bold text-foreground mb-1">{metric.formattedValue}</div>

      {/* Growth Rate */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <TrendingUp className="w-3 h-3 text-[#22c55e]" />
        <span>{metric.growthRate}% CAGR</span>
        <span className="text-xs">({metric.timeframe})</span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function SegmentBar({
  segment,
  index,
}: {
  segment: MarketSegmentBreakdown;
  index: number;
}) {
  const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];
  const color = colors[index % colors.length];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground font-medium">{segment.name}</span>
        <span className="text-muted-foreground">{segment.tamContribution}% of TAM</span>
      </div>
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${segment.tamContribution}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{segment.description}</p>
    </div>
  );
}

export function MarketSizing({
  marketSizing,
  title = 'Market Sizing',
  subtitle,
}: MarketSizingProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!marketSizing) return null;

  // Parse JSON if it comes as a string (from Prisma)
  const data: MarketSizingData =
    typeof marketSizing === 'string' ? JSON.parse(marketSizing) : marketSizing;

  return (
    <CollapsibleSection
      icon={<PieChart className="w-5 h-5 text-[#3b82f6]" />}
      iconBgColor="rgba(59, 130, 246, 0.2)"
      title={title}
      subtitle={subtitle}
      defaultCollapsed={false}
    >
      <div className="space-y-5">
        {/* Three Cards: TAM | SAM | SOM */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MarketCard type="tam" metric={data.tam} label="TAM" />
          <MarketCard type="sam" metric={data.sam} label="SAM" />
          <MarketCard type="som" metric={data.som} label="SOM" />
        </div>

        {/* Segments Breakdown (always visible) */}
        {data.segments && data.segments.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Market Segments</h4>
            <div className="space-y-3">
              {data.segments.slice(0, 4).map((segment, i) => (
                <SegmentBar key={segment.name} segment={segment} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Expandable Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
          />
          {showDetails ? 'Hide' : 'Show'} methodology & sources
        </button>

        {/* Expandable Details Content */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showDetails ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-4 pt-3 border-t border-border">
            {/* Methodology */}
            {data.methodology && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Methodology</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {data.methodology}
                </p>
              </div>
            )}

            {/* Geographic Breakdown */}
            {data.geographicBreakdown && data.geographicBreakdown.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Geographic Focus</h4>
                <div className="flex flex-wrap gap-2">
                  {data.geographicBreakdown.map((geo) => (
                    <span
                      key={geo.region}
                      className="px-2 py-1 text-xs rounded-full bg-card text-muted-foreground"
                    >
                      {geo.region}: {geo.percentage}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Assumptions */}
            {data.assumptions && data.assumptions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#f59e0b]" />
                  Key Assumptions
                </h4>
                <ul className="space-y-2">
                  {data.assumptions.map((assumption, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span
                        className={`font-medium uppercase text-[10px] px-1.5 py-0.5 rounded ${
                          assumption.level === 'tam'
                            ? 'bg-[#3b82f6]/20 text-[#3b82f6]'
                            : assumption.level === 'sam'
                              ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]'
                              : 'bg-[#22c55e]/20 text-[#22c55e]'
                        }`}
                      >
                        {assumption.level}
                      </span>
                      <span className="flex-1">{assumption.assumption}</span>
                      <span
                        className={`text-[10px] ${
                          assumption.impact === 'high'
                            ? 'text-[#ef4444]'
                            : assumption.impact === 'medium'
                              ? 'text-[#f59e0b]'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {assumption.impact} impact
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources */}
            {data.sources && data.sources.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Sources</h4>
                <ul className="space-y-1">
                  {data.sources.map((source, i) => (
                    <li key={i}>
                      {source.url && source.url !== 'N/A' ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-accent hover:opacity-80 transition-opacity"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {source.title}
                          <span className="text-muted-foreground">({source.reliability})</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="w-3 h-3" />
                          {source.title}
                          <span>({source.reliability})</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Last Updated */}
            {data.lastUpdated && (
              <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
                Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}

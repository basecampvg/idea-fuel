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
      return 'bg-primary';
    case 'medium':
      return 'bg-primary/50';
    case 'low':
      return 'bg-red-500';
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
    gradient: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
    accent: 'hsl(10, 80%, 55%)',
  },
  sam: {
    gradient: 'from-primary/15 to-primary/5',
    border: 'border-primary/25',
    accent: 'hsl(10, 70%, 55%)',
  },
  som: {
    gradient: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
    accent: 'hsl(10, 80%, 55%)',
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
      <div className="text-2xl font-semibold text-foreground mb-1">{metric.formattedValue}</div>

      {/* Growth Rate */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <TrendingUp className="w-3 h-3 text-primary" />
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
  const colors = ['hsl(10, 80%, 55%)', 'hsl(10, 70%, 55%)', 'hsl(10, 50%, 65%)', 'hsl(10, 60%, 60%)', 'hsl(10, 40%, 70%)'];
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
      <p className="text-xs text-muted-foreground">{segment.description}</p>
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

  // Parse JSON if it comes as a string
  const data: MarketSizingData =
    typeof marketSizing === 'string' ? JSON.parse(marketSizing) : marketSizing;

  return (
    <CollapsibleSection
      icon={<PieChart className="w-5 h-5 text-primary" />}
      iconBgColor="hsla(10, 80%, 55%, 0.15)"
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
                  <AlertCircle className="w-4 h-4 text-primary" />
                  Key Assumptions
                </h4>
                <ul className="space-y-2">
                  {data.assumptions.map((assumption, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span
                        className={`font-medium uppercase text-xs px-1.5 py-0.5 rounded ${
                          assumption.level === 'tam'
                            ? 'bg-primary/20 text-primary/70'
                            : assumption.level === 'sam'
                              ? 'bg-accent/20 text-accent'
                              : 'bg-primary/20 text-primary'
                        }`}
                      >
                        {assumption.level}
                      </span>
                      <span className="flex-1">{assumption.assumption}</span>
                      <span
                        className={`text-xs ${
                          assumption.impact === 'high'
                            ? 'text-red-400'
                            : assumption.impact === 'medium'
                              ? 'text-primary/50'
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
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}

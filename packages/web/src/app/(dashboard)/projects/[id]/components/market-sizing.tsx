import { TrendingUp, ExternalLink, AlertCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CollapsibleSection } from './collapsible-section';
import { CitationMarker } from '@/components/citation/citation-marker';
import type {
  MarketSizingData,
  MarketMetric,
  MarketSegmentBreakdown,
  MarketAssumption,
  MarketSource,
  ReportCitation,
} from '@forge/shared';

interface MarketSizingProps {
  marketSizing?: MarketSizingData | null;
  title?: string;
  subtitle?: string;
}

// Convert MarketSource[] to ReportCitation[] for CitationMarker
function sourcesToCitations(sources: MarketSource[], claim: string): ReportCitation[] {
  return sources.map((source, i) => ({
    id: `ms-${i}`,
    sectionKey: 'marketSizing',
    claim,
    claimType: 'market_size' as const,
    source: {
      title: source.title,
      url: source.url && source.url !== 'N/A' ? source.url : null,
      date: source.date || null,
      reliability: source.reliability,
    },
    confidence: source.reliability === 'primary' ? 'high' : source.reliability === 'secondary' ? 'medium' : 'low',
  }));
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
const cardStyles: Record<string, { gradient: string; border: string }> = {
  tam: {
    gradient: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
  },
  sam: {
    gradient: 'from-primary/15 to-primary/5',
    border: 'border-primary/25',
  },
  som: {
    gradient: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
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
  sources,
}: {
  type: 'tam' | 'sam' | 'som';
  metric: MarketMetric;
  label: string;
  sources?: MarketSource[];
}) {
  const citations = sources && sources.length > 0
    ? sourcesToCitations(sources, `${label}: ${metric.formattedValue}`)
    : [];
  const styles = cardStyles[type];
  const description = cardDescriptions[type];

  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-b ${styles.gradient} border ${styles.border} transition-all duration-200 hover:scale-[1.02]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            {label}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground/50" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-xs">
              {description}
            </TooltipContent>
          </Tooltip>
        </div>
        <div
          className={`w-2 h-2 rounded-full ${getConfidenceColor(metric.confidence)}`}
          title={getConfidenceLabel(metric.confidence)}
        />
      </div>

      {/* Value */}
      <div className="text-2xl font-semibold text-foreground mb-1 flex items-baseline gap-0.5">
        {metric.formattedValue}
        {citations.map((citation, i) => (
          <CitationMarker key={citation.id} citation={citation} index={i} />
        ))}
      </div>

      {/* Growth Rate */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <TrendingUp className="w-3 h-3 text-primary" />
        <span>{metric.growthRate}% CAGR</span>
        <span className="text-xs">({metric.timeframe})</span>
      </div>
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
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--primary) / 0.8)',
    'hsl(var(--primary) / 0.6)',
    'hsl(var(--primary) / 0.5)',
    'hsl(var(--primary) / 0.4)',
  ];
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
      <p className="text-sm text-muted-foreground">{segment.description}</p>
    </div>
  );
}

export function MarketSizing({
  marketSizing,
  title = 'Market Sizing',
  subtitle,
}: MarketSizingProps) {

  if (!marketSizing) return null;

  // Parse JSON if it comes as a string
  const data: MarketSizingData =
    typeof marketSizing === 'string' ? JSON.parse(marketSizing) : marketSizing;

  return (
    <CollapsibleSection
      title={title}
    >
      <div className="space-y-5">
        {/* Three Cards: TAM | SAM | SOM */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MarketCard type="tam" metric={data.tam} label="TAM" sources={data.sources} />
          <MarketCard type="sam" metric={data.sam} label="SAM" sources={data.sources} />
          <MarketCard type="som" metric={data.som} label="SOM" sources={data.sources} />
        </div>

        {/* Segments Breakdown (always visible) */}
        {data.segments && data.segments.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium uppercase text-primary">Market Segments</h4>
            <div className="space-y-3">
              {data.segments.slice(0, 4).map((segment, i) => (
                <SegmentBar key={segment.name} segment={segment} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Methodology & Sources */}
        <div className="space-y-4 pt-3 border-t border-border">
            {/* Methodology */}
            {data.methodology && (
              <div>
                <h4 className="text-sm font-medium uppercase text-primary mb-2">Methodology</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {data.methodology}
                </p>
              </div>
            )}

            {/* Geographic Breakdown */}
            {data.geographicBreakdown && data.geographicBreakdown.length > 0 && (
              <div>
                <h4 className="text-sm font-medium uppercase text-primary mb-2">Geographic Focus</h4>
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
                <h4 className="text-sm font-medium uppercase text-primary mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  Key Assumptions
                </h4>
                <ul className="space-y-2">
                  {data.assumptions.map((assumption, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
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
                <h4 className="text-sm font-medium uppercase text-primary mb-2">Sources</h4>
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
    </CollapsibleSection>
  );
}

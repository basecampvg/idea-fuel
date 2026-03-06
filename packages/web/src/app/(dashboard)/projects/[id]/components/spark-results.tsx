'use client';

import { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  Target,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUp,
  DollarSign,
} from 'lucide-react';
import type { SparkResult, SparkRedditThread, DataQualityReport, SectionQuality } from '@forge/shared';
import {
  SPARK_VERDICT_LABELS,
  SPARK_VERDICT_DESCRIPTIONS,
} from '@forge/shared';
import { CollapsibleSection } from './collapsible-section';
import { SparkKeywordChart } from './spark-keyword-chart';
import { CompetitorsSection } from './competitors-section';

interface SparkResultsProps {
  result: SparkResult;
  ideaTitle: string;
}

// Trend direction icon and color
function getTrendConfig(direction: string) {
  switch (direction) {
    case 'rising':
      return { Icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/20', label: 'Rising' };
    case 'declining':
      return { Icon: TrendingDown, color: 'text-red-500', bgColor: 'bg-red-500/20', label: 'Declining' };
    case 'flat':
      return { Icon: Minus, color: 'text-amber-500', bgColor: 'bg-amber-500/20', label: 'Stable' };
    default:
      return { Icon: HelpCircle, color: 'text-muted-foreground', bgColor: 'bg-muted/20', label: 'Unknown' };
  }
}

// Verdict badge colors
function getVerdictConfig(verdict: string) {
  switch (verdict) {
    case 'proceed':
      return {
        Icon: CheckCircle2,
        bgColor: 'bg-primary/20',
        borderColor: 'border-primary/30',
        textColor: 'text-primary',
        iconBg: 'hsla(10, 80%, 55%, 0.15)',
      };
    case 'watchlist':
      return {
        Icon: AlertTriangle,
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        textColor: 'text-amber-500',
        iconBg: 'hsla(38, 92%, 50%, 0.15)',
      };
    case 'drop':
      return {
        Icon: XCircle,
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-500',
        iconBg: 'hsla(0, 84%, 60%, 0.15)',
      };
    default:
      return {
        Icon: HelpCircle,
        bgColor: 'bg-muted/20',
        borderColor: 'border-muted/30',
        textColor: 'text-muted-foreground',
        iconBg: 'hsla(10, 80%, 55%, 0.1)',
      };
  }
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

// Card styling for TAM levels
const tamCardStyles = {
  low: {
    gradient: 'from-muted to-muted/30',
    border: 'border-border',
    accent: 'hsl(40, 5%, 55%)',
  },
  base: {
    gradient: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
    accent: 'hsl(10, 80%, 55%)',
  },
  high: {
    gradient: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
    accent: 'hsl(10, 80%, 55%)',
  },
};

function TAMCard({
  type,
  value,
  label,
}: {
  type: 'low' | 'base' | 'high';
  value: number;
  label: string;
}) {
  const styles = tamCardStyles[type];

  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-b ${styles.gradient} border ${styles.border} transition-all duration-200 hover:scale-[1.02]`}
    >
      <span className="text-xs font-bold uppercase tracking-widest text-foreground">
        {label}
      </span>
      <div className={`text-2xl font-semibold mt-2 ${type === 'base' ? 'text-primary/70' : 'text-foreground'}`}>
        {formatNumber(value)}
      </div>
    </div>
  );
}

// Format engagement numbers (1.2k, 5k, etc.)
function formatEngagement(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

// Reddit PostCard component (matches social-proof-section.tsx style)
function SparkPostCard({ thread }: { thread: SparkRedditThread }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border hover:shadow-sm transition-shadow">
      {/* Header: Reddit icon + subreddit + date */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: '#ff4500' }}
          >
            R
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">r/{thread.subreddit}</p>
            {thread.posted && (
              <p className="text-xs text-muted-foreground">{thread.posted}</p>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <a
        href={thread.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-foreground hover:text-accent transition-colors block mb-2 line-clamp-2"
      >
        {thread.title}
      </a>

      {/* Signal insight */}
      {thread.signal && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{thread.signal}</p>
      )}

      {/* Engagement + Link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {thread.upvotes !== undefined && (
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              {formatEngagement(thread.upvotes)}
            </span>
          )}
          {thread.comments !== undefined && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {formatEngagement(thread.comments)}
            </span>
          )}
        </div>
        <a
          href={thread.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:opacity-80 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          View
        </a>
      </div>
    </div>
  );
}

// Confidence level → filled segment count
function confidenceSegments(level: string): number {
  switch (level) {
    case 'high': return 3;
    case 'medium': return 2;
    default: return 1;
  }
}

function confidenceLabel(level: string): string {
  switch (level) {
    case 'high': return 'Strong';
    case 'medium': return 'Moderate';
    default: return 'Weak';
  }
}

// Section label mapping
function getSectionLabel(section: string): string {
  switch (section) {
    case 'demand': return 'Demand';
    case 'tam': return 'Market Size';
    case 'competitors': return 'Competitors';
    default: return section.charAt(0).toUpperCase() + section.slice(1);
  }
}

// Signal meter: 3 ascending bars (like Wi-Fi strength)
function SignalMeter({ filled, size = 'sm' }: { filled: number; size?: 'sm' | 'lg' }) {
  const heights = size === 'lg' ? [10, 16, 22] : [6, 10, 14];
  const barWidth = size === 'lg' ? 6 : 4;
  const gap = size === 'lg' ? 3 : 2;

  return (
    <div className="flex items-end" style={{ gap }}>
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-sm transition-all duration-500"
          style={{
            width: barWidth,
            height: h,
            backgroundColor: i < filled
              ? `hsl(var(--primary) / ${0.5 + (i * 0.25)})`
              : 'hsl(var(--muted))',
          }}
        />
      ))}
    </div>
  );
}

function DataQualityBanner({ quality }: { quality: DataQualityReport }) {
  const overallFilled = confidenceSegments(quality.overall);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Header row: overall confidence */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SignalMeter filled={overallFilled} size="lg" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {confidenceLabel(quality.overall)} Confidence
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{quality.summary}</p>
          </div>
        </div>
        {quality.queriedTopics.length > 0 && (
          <span className="text-xs text-muted-foreground/60 tabular-nums">
            {quality.queriedTopics.length} queries
          </span>
        )}
      </div>

      {/* Section rows */}
      <div className="space-y-0 divide-y divide-border/50">
        {quality.sections.map((section) => {
          const filled = confidenceSegments(section.confidence);
          return (
            <div key={section.section} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <SignalMeter filled={filled} />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground">{getSectionLabel(section.section)}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{section.details}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SparkResults({ result, ideaTitle }: SparkResultsProps) {
  const verdictConfig = getVerdictConfig(result.verdict);
  const trendConfig = getTrendConfig(result.trend_signal.direction);
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <div className="space-y-5">
      {/* Verdict Card */}
      <CollapsibleSection title="Spark Validation">
        <div className="space-y-4">
          {/* Verdict Badge */}
          <div
            className={`flex items-center gap-4 p-4 rounded-xl border ${verdictConfig.bgColor} ${verdictConfig.borderColor}`}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: verdictConfig.iconBg }}
            >
              <verdictConfig.Icon className={`h-6 w-6 ${verdictConfig.textColor}`} />
            </div>
            <div>
              <p className={`text-lg font-semibold ${verdictConfig.textColor}`}>
                {SPARK_VERDICT_LABELS[result.verdict] || result.verdict}
              </p>
              <p className="text-sm text-muted-foreground">
                {SPARK_VERDICT_DESCRIPTIONS[result.verdict]}
              </p>
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result.summary}
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Data Quality Banner */}
      {result.data_quality && (
        <DataQualityBanner quality={result.data_quality} />
      )}

      {/* Search Strategy */}
      {result.keywords.expanded_queries && result.keywords.expanded_queries.length > 0 && (
        <CollapsibleSection
          title="Search Strategy"
        >
          <div className="space-y-3">
            {result.keywords.expansion_notes && (
              <p className="text-xs text-muted-foreground italic">{result.keywords.expansion_notes}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {result.keywords.expanded_queries.map((query, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs rounded-full bg-muted/30 text-muted-foreground border border-border/50"
                >
                  {query}
                </span>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Trend Signal */}
      <CollapsibleSection title="Trend Signal">
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: trendConfig.label === 'Declining' ? 'hsla(0, 84%, 60%, 0.15)' : 'hsla(10, 80%, 55%, 0.15)' }}
            >
              <trendConfig.Icon className={`w-4 h-4 ${trendConfig.color}`} />
            </div>
            <span className={`text-sm font-medium ${trendConfig.color}`}>{trendConfig.label}</span>
          </div>

          {result.trend_signal.evidence.length > 0 && (
            <div className="space-y-3">
              {result.trend_signal.evidence.slice(0, 5).map((evidence, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-card border border-border hover:shadow-sm transition-shadow flex items-start gap-3"
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${trendConfig.color.replace('text-', 'bg-')}`} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{evidence.claim}</p>
                    {evidence.source_url && (
                      <a
                        href={evidence.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-xs text-accent hover:opacity-80 transition-opacity"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Source
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Keywords */}
      <CollapsibleSection title="Keywords">
        <div className="flex flex-wrap gap-2">
          {result.keywords.phrases.map((phrase, i) => (
            <span
              key={i}
              className="px-3 py-1.5 text-sm rounded-full bg-primary/10 text-primary/70 border border-primary/20"
            >
              {phrase}
            </span>
          ))}
        </div>
      </CollapsibleSection>

      {/* Keyword Trends Chart */}
      {result.keyword_trends && result.keyword_trends.length > 0 && (
        <SparkKeywordChart
          keywordTrends={result.keyword_trends}
          title="Keyword Trends"
          subtitle="Google Trends search interest over time"
        />
      )}

      {/* TAM Range */}
      <CollapsibleSection
        title="Market Size (TAM)"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TAMCard type="low" value={result.tam.low} label="Conservative" />
            <TAMCard type="base" value={result.tam.base} label="Base Case" />
            <TAMCard type="high" value={result.tam.high} label="Optimistic" />
          </div>

          {result.tam.assumptions.length > 0 && (
            <>
              <button
                onClick={() => setShowAssumptions(!showAssumptions)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showAssumptions ? 'rotate-180' : ''}`}
                />
                {showAssumptions ? 'Hide' : 'Show'} assumptions & sources
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  showAssumptions ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="space-y-4 pt-3 border-t border-border">
                  <div>
                    <p className="text-sm font-medium uppercase text-primary mb-2">Assumptions</p>
                    <ul className="space-y-2">
                      {result.tam.assumptions.map((assumption, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary">&bull;</span>
                          <span>{assumption}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {result.tam.citations.length > 0 && (
                    <div>
                      <p className="text-sm font-medium uppercase text-primary mb-2">Sources</p>
                      <ul className="space-y-1">
                        {result.tam.citations.map((citation, i) => (
                          <li key={i}>
                            <a
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-accent hover:opacity-80 transition-opacity"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {citation.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Reddit Signals */}
      <CollapsibleSection
        title="Reddit Signals"
      >
        <div className="space-y-5">
          {result.reddit.top_threads.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-foreground">Top Threads</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.reddit.top_threads.map((thread, i) => (
                  <SparkPostCard key={i} thread={thread} />
                ))}
              </div>
            </div>
          )}

          {result.reddit.recurring_pains.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">Recurring Pains</p>
              <div className="flex flex-wrap gap-2">
                {result.reddit.recurring_pains.map((pain, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 text-xs rounded-full bg-red-500/10 text-red-400 border border-red-500/20"
                  >
                    {pain}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.reddit.willingness_to_pay_clues.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">Willingness to Pay Clues</p>
              <div className="space-y-2">
                {result.reddit.willingness_to_pay_clues.map((clue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-3 px-4 rounded-lg bg-primary/5 border-l-3 border-primary"
                  >
                    <DollarSign className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-primary">{clue}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.reddit.top_threads.length === 0 &&
            result.reddit.recurring_pains.length === 0 &&
            result.reddit.willingness_to_pay_clues.length === 0 && (
              <p className="text-sm text-muted-foreground p-4 rounded-xl bg-card border border-border text-center">
                No Reddit signals found for this idea.
              </p>
            )}
        </div>
      </CollapsibleSection>

      {/* Facebook Groups */}
      <CollapsibleSection
        title="Facebook Groups"
      >
        {result.facebook_groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.facebook_groups.map((group, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <a
                      href={group.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-accent transition-colors block truncate"
                    >
                      {group.name}
                    </a>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{group.members}</span>
                      <span>&bull;</span>
                      <span className="capitalize">{group.privacy}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">Fit</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className={`w-2 h-2 rounded-full ${
                            n <= group.fit_score ? 'bg-primary/70' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-4 rounded-xl bg-card border border-border text-center">
            No Facebook Groups found for this idea.
          </p>
        )}
      </CollapsibleSection>

      {/* Competitors */}
      {result.competitors && result.competitors.length > 0 && (
        <CompetitorsSection
          competitors={result.competitors}
          title="Competitive Landscape"
          subtitle={`${result.competitors.length} competitor${result.competitors.length === 1 ? '' : 's'} identified`}
        />
      )}
    </div>
  );
}

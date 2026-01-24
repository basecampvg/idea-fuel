'use client';

import { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  ExternalLink,
  Users,
  MessageSquare,
  Target,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PieChart,
  ArrowUp,
} from 'lucide-react';
import type { SparkResult, SparkRedditThread } from '@forge/shared';
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
      return { Icon: TrendingUp, color: 'text-[#22c55e]', bgColor: 'bg-[#22c55e]/20', label: 'Rising' };
    case 'declining':
      return { Icon: TrendingDown, color: 'text-[#ef4444]', bgColor: 'bg-[#ef4444]/20', label: 'Declining' };
    case 'flat':
      return { Icon: Minus, color: 'text-[#f59e0b]', bgColor: 'bg-[#f59e0b]/20', label: 'Stable' };
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
        bgColor: 'bg-[#22c55e]/20',
        borderColor: 'border-[#22c55e]/30',
        textColor: 'text-[#22c55e]',
        iconBg: 'rgba(34, 197, 94, 0.2)',
      };
    case 'watchlist':
      return {
        Icon: AlertTriangle,
        bgColor: 'bg-[#f59e0b]/20',
        borderColor: 'border-[#f59e0b]/30',
        textColor: 'text-[#f59e0b]',
        iconBg: 'rgba(245, 158, 11, 0.2)',
      };
    case 'drop':
      return {
        Icon: XCircle,
        bgColor: 'bg-[#ef4444]/20',
        borderColor: 'border-[#ef4444]/30',
        textColor: 'text-[#ef4444]',
        iconBg: 'rgba(239, 68, 68, 0.2)',
      };
    default:
      return {
        Icon: HelpCircle,
        bgColor: 'bg-muted/20',
        borderColor: 'border-muted/30',
        textColor: 'text-muted-foreground',
        iconBg: 'rgba(106, 106, 122, 0.2)',
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
    gradient: 'from-[#6a6a7a]/20 to-[#6a6a7a]/5',
    border: 'border-[#6a6a7a]/30',
    accent: '#6a6a7a',
  },
  base: {
    gradient: 'from-[#3b82f6]/20 to-[#3b82f6]/5',
    border: 'border-[#3b82f6]/30',
    accent: '#3b82f6',
  },
  high: {
    gradient: 'from-[#22c55e]/20 to-[#22c55e]/5',
    border: 'border-[#22c55e]/30',
    accent: '#22c55e',
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
      className={`p-5 rounded-xl bg-gradient-to-b ${styles.gradient} border ${styles.border} transition-all duration-200 hover:scale-[1.02]`}
    >
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className={`text-2xl font-bold mt-2 ${type === 'base' ? 'text-[#3b82f6]' : 'text-foreground'}`}>
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
    <div className="p-4 rounded-xl bg-card border border-border">
      {/* Header: Reddit icon + subreddit + date */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
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

export function SparkResults({ result, ideaTitle }: SparkResultsProps) {
  const verdictConfig = getVerdictConfig(result.verdict);
  const trendConfig = getTrendConfig(result.trend_signal.direction);
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <div className="space-y-5">
      {/* Verdict Card */}
      <div className="rounded-2xl bg-background border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
          >
            <Sparkles className="w-5 h-5 text-[#f59e0b]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Spark Validation</h2>
            <p className="text-xs text-muted-foreground">Quick market validation results</p>
          </div>
        </div>

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
          <div className="mt-4 p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.summary}
            </p>
          </div>
        )}
      </div>

      {/* Trend Signal */}
      <div className="rounded-2xl bg-background border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: trendConfig.bgColor.replace('bg-', '').replace('/20', '') === '[#22c55e]' ? 'rgba(34, 197, 94, 0.2)' : trendConfig.bgColor.replace('bg-', '').replace('/20', '') === '[#ef4444]' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)' }}
          >
            <trendConfig.Icon className={`w-5 h-5 ${trendConfig.color}`} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Trend Signal</h2>
            <p className={`text-xs font-medium ${trendConfig.color}`}>{trendConfig.label}</p>
          </div>
        </div>

        {result.trend_signal.evidence.length > 0 && (
          <div className="space-y-3">
            {result.trend_signal.evidence.slice(0, 5).map((evidence, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-card border border-border flex items-start gap-3"
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

      {/* Keywords */}
      <div className="rounded-2xl bg-background border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
          >
            <Target className="w-5 h-5 text-[#3b82f6]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Keywords</h2>
            <p className="text-xs text-muted-foreground">Target search phrases</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {result.keywords.phrases.map((phrase, i) => (
            <span
              key={i}
              className="px-3 py-1.5 text-sm rounded-full bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
            >
              {phrase}
            </span>
          ))}
        </div>
      </div>

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
        icon={<PieChart className="w-5 h-5 text-[#22c55e]" />}
        iconBgColor="rgba(34, 197, 94, 0.2)"
        title="Market Size (TAM)"
        subtitle="Total addressable market estimate"
        defaultCollapsed={false}
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
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Assumptions</p>
                    <ul className="space-y-2">
                      {result.tam.assumptions.map((assumption, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-[#22c55e]">&bull;</span>
                          <span>{assumption}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {result.tam.citations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Sources</p>
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
        icon={<MessageSquare className="w-5 h-5 text-[#ff4500]" />}
        iconBgColor="rgba(255, 69, 0, 0.2)"
        title="Reddit Signals"
        subtitle="Community discussions and pain points"
      >
        <div className="space-y-5">
          {result.reddit.top_threads.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Threads</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.reddit.top_threads.map((thread, i) => (
                  <SparkPostCard key={i} thread={thread} />
                ))}
              </div>
            </div>
          )}

          {result.reddit.recurring_pains.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Recurring Pains</p>
              <div className="flex flex-wrap gap-2">
                {result.reddit.recurring_pains.map((pain, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 text-xs rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"
                  >
                    {pain}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.reddit.willingness_to_pay_clues.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Willingness to Pay Clues</p>
              <div className="flex flex-wrap gap-2">
                {result.reddit.willingness_to_pay_clues.map((clue, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 text-xs rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20"
                  >
                    {clue}
                  </span>
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
        icon={<Users className="w-5 h-5 text-[#1877f2]" />}
        iconBgColor="rgba(24, 119, 242, 0.2)"
        title="Facebook Groups"
        subtitle="Relevant communities to explore"
      >
        {result.facebook_groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.facebook_groups.map((group, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border">
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
                            n <= group.fit_score ? 'bg-[#1877f2]' : 'bg-muted'
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

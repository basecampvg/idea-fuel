'use client';

import { AlertCircle, ChevronDown } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import { SeverityIndicator } from './ui/severity-indicator';

export interface PainPoint {
  problem: string;
  severity: 'high' | 'medium' | 'low';
  currentSolutions: string[];
  gaps: string[];
  affectedSegment?: string;
  frequencyOfOccurrence?: string;
  costOfInaction?: string;
  emotionalImpact?: string;
  evidenceQuotes?: string[];
}

interface PainPointsSectionProps {
  painPoints?: PainPoint[] | null;
  title?: string;
  subtitle?: string;
}

function mapSeverity(severity?: string): 'high' | 'medium' | 'low' {
  const s = (severity || '').toLowerCase();
  if (s.includes('high') || s.includes('critical')) return 'high';
  if (s.includes('med')) return 'medium';
  return 'low';
}

function getSeverityBadgeClasses(severity?: string): string {
  return {
    high: 'bg-red-500/10 text-red-500 border border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  }[mapSeverity(severity)];
}

function getFirstQuote(pp: PainPoint): string | null {
  if (pp.evidenceQuotes && pp.evidenceQuotes.length > 0) {
    return pp.evidenceQuotes[0];
  }
  if (pp.emotionalImpact) {
    return pp.emotionalImpact;
  }
  return null;
}

export function PainPointsSection({ painPoints, title = 'Pain Points', subtitle }: PainPointsSectionProps) {
  if (!painPoints || painPoints.length === 0) return null;

  // Sort by severity (high first)
  const sortedPainPoints = [...painPoints].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  // Use provided subtitle or generate default
  const displaySubtitle = subtitle || `${painPoints.length} problems identified`;

  return (
    <CollapsibleSection
      icon={<AlertCircle className="w-5 h-5 text-primary" />}
      iconBgColor="hsla(10, 80%, 55%, 0.15)"
      title={title}
      subtitle={displaySubtitle}
    >
      <div className="flex flex-col gap-2">
        {sortedPainPoints.map((pp, i) => {
          const level = mapSeverity(pp.severity);
          const badgeClasses = getSeverityBadgeClasses(pp.severity);
          const firstQuote = getFirstQuote(pp);
          const hasSolutions = pp.currentSolutions && pp.currentSolutions.length > 0;
          const hasGaps = pp.gaps && pp.gaps.length > 0;

          return (
            <details
              key={i}
              className="rounded-lg bg-card border border-border overflow-hidden group"
              open={i === 0 ? true : undefined}
            >
              <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                <SeverityIndicator level={level} />
                <span className="flex-1 font-semibold text-sm">{pp.problem}</span>
                {pp.costOfInaction && (
                  <span className="font-mono text-xs font-semibold text-primary">
                    {pp.costOfInaction}
                  </span>
                )}
                {pp.frequencyOfOccurrence && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {pp.frequencyOfOccurrence}
                  </span>
                )}
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${badgeClasses}`}>
                  {pp.severity}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>

              <div className="px-5 pb-5 border-t border-border/50">
                {firstQuote && (
                  <blockquote className="italic text-[13px] text-muted-foreground border-l-2 border-amber-500 pl-4 my-3 leading-relaxed">
                    &ldquo;{firstQuote}&rdquo;
                  </blockquote>
                )}

                {(hasSolutions || hasGaps) && (
                  <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                    {hasSolutions && (
                      <div>
                        <h5 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground font-mono mb-1">
                          Current Solutions
                        </h5>
                        <ul className="space-y-0.5">
                          {pp.currentSolutions.map((s, si) => (
                            <li key={si} className="text-muted-foreground">{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hasGaps && (
                      <div>
                        <h5 className="text-[9px] font-bold uppercase tracking-wider text-red-500 font-mono mb-1">
                          Gaps
                        </h5>
                        <ul className="space-y-0.5">
                          {pp.gaps.map((g, gi) => (
                            <li key={gi} className="text-red-400">{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

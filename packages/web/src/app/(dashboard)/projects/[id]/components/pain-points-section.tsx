'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Users, Clock, DollarSign } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

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

function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    medium: { bg: 'bg-primary/10', text: 'text-primary/50', border: 'border-primary/20' },
    low: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  }[severity] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border}`}>
      {severity}
    </span>
  );
}

function PainPointCard({ painPoint }: { painPoint: PainPoint }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const hasEvidence = painPoint.evidenceQuotes && painPoint.evidenceQuotes.length > 0;
  const hasEnrichedMeta = painPoint.affectedSegment || painPoint.frequencyOfOccurrence || painPoint.costOfInaction;

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-foreground font-medium">{painPoint.problem}</p>
        <SeverityBadge severity={painPoint.severity} />
      </div>

      {/* Enriched metadata row */}
      {hasEnrichedMeta && (
        <div className="flex flex-wrap gap-2 mb-3">
          {painPoint.affectedSegment && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-2.5 h-2.5" />
              {painPoint.affectedSegment}
            </span>
          )}
          {painPoint.frequencyOfOccurrence && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-2.5 h-2.5" />
              {painPoint.frequencyOfOccurrence}
            </span>
          )}
          {painPoint.costOfInaction && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              <DollarSign className="w-2.5 h-2.5" />
              {painPoint.costOfInaction}
            </span>
          )}
        </div>
      )}

      {/* Emotional impact */}
      {painPoint.emotionalImpact && (
        <p className="text-xs text-muted-foreground/80 italic mb-3">
          &ldquo;{painPoint.emotionalImpact}&rdquo;
        </p>
      )}

      {painPoint.currentSolutions.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Current Solutions</p>
          <div className="flex flex-wrap gap-1">
            {painPoint.currentSolutions.map((solution, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-border text-muted-foreground">
                {solution}
              </span>
            ))}
          </div>
        </div>
      )}

      {painPoint.gaps.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-muted-foreground mb-1">Solution Gaps</p>
          <ul className="space-y-1">
            {painPoint.gaps.map((gap, i) => (
              <li key={i} className="text-xs text-primary/50 flex items-start gap-1">
                <span>&#8594;</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence quotes (expandable) */}
      {hasEvidence && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {painPoint.evidenceQuotes!.length} evidence point{painPoint.evidenceQuotes!.length !== 1 ? 's' : ''}
          </button>
          {showEvidence && (
            <ul className="mt-2 space-y-1.5">
              {painPoint.evidenceQuotes!.map((quote, i) => (
                <li key={i} className="text-xs text-muted-foreground/70 pl-3 border-l-2 border-accent/20">
                  {quote}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedPainPoints.map((painPoint, i) => (
          <PainPointCard key={i} painPoint={painPoint} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

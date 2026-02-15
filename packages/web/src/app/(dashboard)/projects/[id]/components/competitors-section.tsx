'use client';

import { Swords, ThumbsUp, ThumbsDown, ExternalLink, Target } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface Competitor {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  positioning: string;
  website?: string;
  fundingStage?: string;
  estimatedRevenue?: string;
  targetSegment?: string;
  pricingModel?: string;
  keyDifferentiator?: string;
  vulnerability?: string;
}

interface CompetitorsSectionProps {
  competitors?: Competitor[] | null;
  title?: string;
  subtitle?: string;
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  const hasMeta = competitor.fundingStage || competitor.estimatedRevenue || competitor.pricingModel || competitor.targetSegment;

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-foreground">{competitor.name}</h3>
        {competitor.website && (
          <a
            href={competitor.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{competitor.description}</p>

      {/* Metadata badges */}
      {hasMeta && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {competitor.fundingStage && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {competitor.fundingStage}
            </span>
          )}
          {competitor.estimatedRevenue && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {competitor.estimatedRevenue}
            </span>
          )}
          {competitor.pricingModel && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {competitor.pricingModel}
            </span>
          )}
          {competitor.targetSegment && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Target className="w-2.5 h-2.5" />
              {competitor.targetSegment}
            </span>
          )}
        </div>
      )}

      {competitor.positioning && (
        <p className="text-xs text-muted-foreground italic mb-3">
          &ldquo;{competitor.positioning}&rdquo;
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Strengths */}
        {competitor.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <ThumbsUp className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">Strengths</span>
            </div>
            <ul className="space-y-1">
              {competitor.strengths.map((strength, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-primary shrink-0">+</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {competitor.weaknesses.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <ThumbsDown className="w-3 h-3 text-[#ef4444]" />
              <span className="text-xs text-muted-foreground">Weaknesses</span>
            </div>
            <ul className="space-y-1">
              {competitor.weaknesses.map((weakness, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-[#ef4444] shrink-0">-</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Key Differentiator */}
      {competitor.keyDifferentiator && (
        <div className="mt-3 pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Key Differentiator</p>
          <p className="text-xs text-foreground/80">{competitor.keyDifferentiator}</p>
        </div>
      )}

      {/* Vulnerability */}
      {competitor.vulnerability && (
        <div className="mt-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
          <p className="text-[10px] text-red-400/80 uppercase tracking-wider mb-0.5">Vulnerability</p>
          <p className="text-xs text-red-400/70">{competitor.vulnerability}</p>
        </div>
      )}
    </div>
  );
}

export function CompetitorsSection({ competitors, title = 'Competitive Landscape', subtitle }: CompetitorsSectionProps) {
  if (!competitors || competitors.length === 0) return null;

  const displaySubtitle = subtitle || `${competitors.length} competitors identified`;

  return (
    <CollapsibleSection
      icon={<Swords className="w-5 h-5 text-primary" />}
      iconBgColor="hsl(var(--primary) / 0.15)"
      title={title}
      subtitle={displaySubtitle}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {competitors.map((competitor, i) => (
          <CompetitorCard key={i} competitor={competitor} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

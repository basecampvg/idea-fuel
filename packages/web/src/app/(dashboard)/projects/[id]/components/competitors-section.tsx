'use client';

import { Building2, ExternalLink, Check, X } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import { ThreatBar } from './ui/threat-bar';

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

function deriveThreatScore(competitor: Competitor, index: number): number {
  const vuln = (competitor.vulnerability ?? '').toLowerCase();
  if (vuln.includes('direct') || vuln.includes('primary')) return 8;

  const funding = (competitor.fundingStage ?? '').toLowerCase();
  if (funding.includes('series')) return 7;

  const desc = (competitor.description ?? '').toLowerCase();
  const pricing = (competitor.pricingModel ?? '').toLowerCase();
  if (desc.includes('free') || pricing === 'free' || pricing.includes('freemium')) return 5;

  // Fall back to position-based: earlier = more threatening
  return Math.max(4, 8 - index);
}

function CompetitorCard({ competitor, index }: { competitor: Competitor; index: number }) {
  const threatScore = deriveThreatScore(competitor, index);
  const hasStrengthsOrWeaknesses = competitor.strengths.length > 0 || competitor.weaknesses.length > 0;

  return (
    <div className="rounded-xl bg-card border border-border hover:shadow-sm transition-shadow">
      {/* Top: info + threat bar */}
      <div className="flex items-center gap-6 p-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{competitor.name}</span>
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
          {(competitor.fundingStage || competitor.pricingModel) && (
            <div className="text-xs text-muted-foreground mt-0.5 flex gap-4">
              {competitor.fundingStage && <span>{competitor.fundingStage}</span>}
              {competitor.pricingModel && <span>{competitor.pricingModel}</span>}
            </div>
          )}
          {competitor.description && (
            <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {competitor.description}
            </div>
          )}
        </div>
        <ThreatBar score={threatScore} />
      </div>

      {/* Bottom: strengths/weaknesses below divider */}
      {hasStrengthsOrWeaknesses && (
        <div className="border-t border-border/50 px-4 py-3 grid grid-cols-2 gap-6 text-[11px]">
          {competitor.strengths.length > 0 && (
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-success mb-1">
                Strengths
              </h5>
              <ul className="space-y-0.5">
                {competitor.strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                    <Check className="w-3 h-3 text-success mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {competitor.weaknesses.length > 0 && (
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                Weaknesses
              </h5>
              <ul className="space-y-0.5">
                {competitor.weaknesses.slice(0, 3).map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                    <X className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
      title={title}
    >
      <div className="flex flex-col gap-2">
        {competitors.map((competitor, i) => (
          <CompetitorCard key={i} competitor={competitor} index={i} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

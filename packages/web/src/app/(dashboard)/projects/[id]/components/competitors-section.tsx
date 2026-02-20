'use client';

import { Swords, Building2, ExternalLink, Check, X } from 'lucide-react';
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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '\u2026';
}

function CompetitorCard({ competitor, index }: { competitor: Competitor; index: number }) {
  const threatScore = deriveThreatScore(competitor, index);

  return (
    <div className="flex items-center gap-6 p-4 rounded-lg bg-card border border-border hover:shadow-sm transition-shadow">
      {/* Left: info */}
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
          <div className="text-[11px] text-muted-foreground font-mono mt-0.5 flex gap-4">
            {competitor.fundingStage && <span>{competitor.fundingStage}</span>}
            {competitor.pricingModel && <span>{competitor.pricingModel}</span>}
          </div>
        )}
        {competitor.description && (
          <div className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {competitor.description}
          </div>
        )}
      </div>

      {/* Middle: threat bar */}
      <ThreatBar score={threatScore} />

      {/* Right: strengths/weaknesses */}
      <div className="hidden md:flex gap-6 text-[11px] shrink-0">
        {competitor.strengths.length > 0 && (
          <div>
            <h5 className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 font-mono mb-0.5">
              Strengths
            </h5>
            <ul className="space-y-0.5">
              {competitor.strengths.slice(0, 2).map((s, i) => (
                <li key={i} className="flex items-start gap-1 text-muted-foreground">
                  <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{truncate(s, 24)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {competitor.weaknesses.length > 0 && (
          <div>
            <h5 className="text-[9px] font-bold uppercase tracking-wider text-red-500 font-mono mb-0.5">
              Weaknesses
            </h5>
            <ul className="space-y-0.5">
              {competitor.weaknesses.slice(0, 2).map((w, i) => (
                <li key={i} className="flex items-start gap-1 text-muted-foreground">
                  <X className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                  <span>{truncate(w, 24)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
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
      <div className="flex flex-col gap-2">
        {competitors.map((competitor, i) => (
          <CompetitorCard key={i} competitor={competitor} index={i} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

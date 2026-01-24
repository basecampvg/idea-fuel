'use client';

import { Swords, ThumbsUp, ThumbsDown } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface Competitor {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  positioning: string;
}

interface CompetitorsSectionProps {
  competitors?: Competitor[] | null;
  title?: string;
  subtitle?: string;
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <h3 className="text-sm font-semibold text-foreground mb-1">{competitor.name}</h3>
      <p className="text-xs text-muted-foreground mb-3">{competitor.description}</p>

      {competitor.positioning && (
        <p className="text-xs text-muted-foreground italic mb-3">
          "{competitor.positioning}"
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Strengths */}
        {competitor.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <ThumbsUp className="w-3 h-3 text-[#22c55e]" />
              <span className="text-xs text-muted-foreground">Strengths</span>
            </div>
            <ul className="space-y-1">
              {competitor.strengths.slice(0, 3).map((strength, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-[#22c55e]">+</span>
                  <span className="line-clamp-1">{strength}</span>
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
              {competitor.weaknesses.slice(0, 3).map((weakness, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-[#ef4444]">-</span>
                  <span className="line-clamp-1">{weakness}</span>
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

  // Use provided subtitle or generate default
  const displaySubtitle = subtitle || `${competitors.length} competitors identified`;

  return (
    <CollapsibleSection
      icon={<Swords className="w-5 h-5 text-[#e91e8c]" />}
      iconBgColor="rgba(233, 30, 140, 0.2)"
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

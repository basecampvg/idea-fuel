'use client';

import { Swords, ThumbsUp, ThumbsDown } from 'lucide-react';

export interface Competitor {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  positioning: string;
}

interface CompetitorsSectionProps {
  competitors?: Competitor[] | null;
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  return (
    <div className="p-4 rounded-xl bg-[#1a1a24] border border-[#1e1e2a]">
      <h3 className="text-sm font-semibold text-white mb-1">{competitor.name}</h3>
      <p className="text-xs text-[#6a6a7a] mb-3">{competitor.description}</p>

      {competitor.positioning && (
        <p className="text-xs text-[#a0a0b0] italic mb-3">
          "{competitor.positioning}"
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Strengths */}
        {competitor.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <ThumbsUp className="w-3 h-3 text-[#22c55e]" />
              <span className="text-xs text-[#6a6a7a]">Strengths</span>
            </div>
            <ul className="space-y-1">
              {competitor.strengths.slice(0, 3).map((strength, i) => (
                <li key={i} className="text-xs text-[#a0a0b0] flex items-start gap-1">
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
              <span className="text-xs text-[#6a6a7a]">Weaknesses</span>
            </div>
            <ul className="space-y-1">
              {competitor.weaknesses.slice(0, 3).map((weakness, i) => (
                <li key={i} className="text-xs text-[#a0a0b0] flex items-start gap-1">
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

export function CompetitorsSection({ competitors }: CompetitorsSectionProps) {
  if (!competitors || competitors.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-[#e91e8c]/20 flex items-center justify-center">
          <Swords className="w-5 h-5 text-[#e91e8c]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Competitive Landscape</h2>
          <p className="text-xs text-[#6a6a7a]">{competitors.length} competitors identified</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {competitors.map((competitor, i) => (
          <CompetitorCard key={i} competitor={competitor} />
        ))}
      </div>
    </div>
  );
}

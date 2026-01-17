'use client';

import { Info } from 'lucide-react';

interface ScoreCardsProps {
  opportunityScore?: number | null;
  problemScore?: number | null;
  feasibilityScore?: number | null;
  whyNowScore?: number | null;
}

interface ScoreCardProps {
  label: string;
  score: number | null | undefined;
  description: string;
  colorType: 'opportunity' | 'problem' | 'feasibility' | 'whynow';
  isHighlighted?: boolean;
}

function getScoreDescription(score: number | null | undefined, colorType: string): string {
  if (score === null || score === undefined) return 'No data';

  // Special descriptions for problem score
  if (colorType === 'problem') {
    if (score >= 8) return 'High Pain';
    if (score >= 6) return 'Moderate Pain';
    if (score >= 4) return 'Some Pain';
    return 'Low Pain';
  }

  // Standard descriptions
  if (score >= 9) return 'Exceptional';
  if (score >= 8) return 'Very Easy';
  if (score >= 7) return 'Strong';
  if (score >= 6) return 'Good';
  if (score >= 5) return 'Moderate';
  return 'Needs work';
}

// Map to special label for Why Now
function getSpecialDescription(colorType: string, score: number | null | undefined): string {
  if (score === null || score === undefined) return '';

  if (colorType === 'whynow' && score >= 8) return 'Perfect Timing';
  if (colorType === 'feasibility' && score >= 8) return 'Very Easy';
  if (colorType === 'opportunity' && score >= 8) return 'Exceptional';

  return getScoreDescription(score, colorType);
}

function ScoreCard({ label, score, colorType, isHighlighted = false }: ScoreCardProps) {
  const displayScore = score ?? '--';
  const description = getSpecialDescription(colorType, score);

  // Underline colors matching screenshot exactly
  const underlineColors: Record<string, string> = {
    opportunity: 'bg-[#22c55e]',  // Green
    problem: 'bg-[#e91e8c]',      // Pink
    feasibility: 'bg-[#4ecdc4]',  // Teal
    whynow: 'bg-[#8b5cf6]',       // Purple
  };

  // Card styling - highlighted for "High Pain"
  const cardClass = isHighlighted
    ? 'bg-[#12121a] border border-[#e91e8c] rounded-xl p-4 shadow-[0_0_20px_rgba(233,30,140,0.2)]'
    : 'bg-[#12121a] border border-[#1e1e2a] rounded-xl p-4';

  return (
    <div className={cardClass}>
      {/* Header: Label + info icon */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-[11px] text-[#6a6a7a] font-medium">
          {label}
        </span>
        <Info className="w-3 h-3 text-[#6a6a7a]" />
      </div>

      {/* Score - large number */}
      <div className="text-[32px] font-bold text-white tabular-nums leading-none">
        {displayScore}
      </div>

      {/* Description below score */}
      <p className="text-xs text-[#a0a0b0] mt-1">
        {description}
      </p>

      {/* Colored underline bar */}
      <div className={`h-[3px] rounded-sm mt-3 ${underlineColors[colorType]}`} />
    </div>
  );
}

export function ScoreCards({
  opportunityScore,
  problemScore,
  feasibilityScore,
  whyNowScore,
}: ScoreCardsProps) {
  // Determine if problem score should be highlighted (High Pain effect)
  const isProblemHighlighted = problemScore !== null && problemScore !== undefined && problemScore >= 7;

  return (
    <div className="grid grid-cols-2 gap-3">
      <ScoreCard
        label="Opportunity"
        score={opportunityScore}
        description=""
        colorType="opportunity"
      />
      <ScoreCard
        label="Problem"
        score={problemScore}
        description=""
        colorType="problem"
        isHighlighted={isProblemHighlighted}
      />
      <ScoreCard
        label="Feasibility"
        score={feasibilityScore}
        description=""
        colorType="feasibility"
      />
      <ScoreCard
        label="Why Now"
        score={whyNowScore}
        description=""
        colorType="whynow"
      />
    </div>
  );
}

'use client';

import { DollarSign, Settings, Rocket, Target, ChevronRight } from 'lucide-react';

interface RevenuePotential {
  rating: 'high' | 'medium' | 'low';
  estimate: string;
  confidence: number;
}

interface ExecutionDifficulty {
  rating: 'easy' | 'medium' | 'hard';
  factors: string[];
  soloFriendly: boolean;
}

interface GTMClarity {
  rating: 'strong' | 'moderate' | 'weak';
  channels: string[];
  confidence: number;
}

interface FounderFit {
  percentage: number;
  strengths: string[];
  gaps: string[];
}

interface BusinessFitProps {
  revenuePotential?: RevenuePotential | null;
  executionDifficulty?: ExecutionDifficulty | null;
  gtmClarity?: GTMClarity | null;
  founderFit?: FounderFit | null;
}

interface BusinessFitItemProps {
  icon: React.ReactNode;
  iconColorClass: string;
  title: string;
  description: string;
  value?: string;
  isLink?: boolean;
}

function BusinessFitItem({ icon, iconColorClass, title, description, value, isLink }: BusinessFitItemProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#1e1e2a] last:border-0">
      {/* Solid Icon Circle */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconColorClass}`}>
        {icon}
      </div>

      {/* Text Column */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-[#6a6a7a] truncate">{description}</p>
      </div>

      {/* Value OR Link */}
      {isLink ? (
        <button className="flex items-center gap-1 text-sm text-[#00d4ff] hover:opacity-80 transition-opacity">
          <span>Find Out</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      ) : value ? (
        <span className="text-sm font-semibold text-white shrink-0">{value}</span>
      ) : null}
    </div>
  );
}

function getRevenueDisplay(data: RevenuePotential | null | undefined): {
  value: string;
  description: string;
} {
  if (!data) {
    return { value: '$$$', description: '$1M-$5M ARR potential wit...' };
  }

  // Display dollar signs based on rating
  const dollarSigns: Record<string, string> = {
    high: '$$$',
    medium: '$$',
    low: '$',
  };

  return {
    value: dollarSigns[data.rating] || '$$$',
    description: data.estimate || `$1M-$5M ARR potential wit...`,
  };
}

function getExecutionDisplay(data: ExecutionDifficulty | null | undefined): {
  value: string;
  description: string;
} {
  if (!data) {
    return { value: '3/10', description: 'Simple build targeting card sel...' };
  }

  // Convert rating to score
  const ratingScores: Record<string, string> = {
    easy: '3/10',
    medium: '5/10',
    hard: '8/10',
  };

  const factorsText = data.factors?.length
    ? data.factors.slice(0, 2).join(', ')
    : data.soloFriendly
    ? 'Simple build targeting card sel...'
    : 'Team recommended';

  return {
    value: ratingScores[data.rating] || '5/10',
    description: factorsText,
  };
}

function getGTMDisplay(data: GTMClarity | null | undefined): {
  value: string;
  description: string;
} {
  if (!data) {
    return { value: '9/10', description: 'Strong traction in sports card c...' };
  }

  // Convert rating to score
  const ratingScores: Record<string, string> = {
    strong: '9/10',
    moderate: '6/10',
    weak: '3/10',
  };

  const channelsText = data.channels?.length
    ? `Strong traction in ${data.channels[0]}...`
    : 'Strong traction in sports card c...';

  return {
    value: ratingScores[data.rating] || '6/10',
    description: channelsText,
  };
}

function getFounderFitDisplay(data: FounderFit | null | undefined): {
  description: string;
} {
  if (!data) {
    return { description: 'Ideal for founders with e-com...' };
  }

  const strengthsText = data.strengths?.length
    ? `Ideal for founders with ${data.strengths[0]}...`
    : data.gaps?.length
    ? `Gaps: ${data.gaps[0]}...`
    : 'Ideal for founders with e-com...';

  return {
    description: strengthsText,
  };
}

// Helper to parse JSON if it's a string
function parseJson<T>(data: T | string | null | undefined): T | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data as T;
}

export function BusinessFit({
  revenuePotential: rawRevenuePotential,
  executionDifficulty: rawExecutionDifficulty,
  gtmClarity: rawGtmClarity,
  founderFit: rawFounderFit,
}: BusinessFitProps) {
  // Parse JSON fields that might come as strings from Prisma
  const revenuePotential = parseJson<RevenuePotential>(rawRevenuePotential);
  const executionDifficulty = parseJson<ExecutionDifficulty>(rawExecutionDifficulty);
  const gtmClarity = parseJson<GTMClarity>(rawGtmClarity);
  const founderFit = parseJson<FounderFit>(rawFounderFit);

  const revenue = getRevenueDisplay(revenuePotential);
  const execution = getExecutionDisplay(executionDifficulty);
  const gtm = getGTMDisplay(gtmClarity);
  const fit = getFounderFitDisplay(founderFit);

  return (
    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-5">
      <h2 className="text-base font-semibold text-white mb-4">
        Business Fit
      </h2>

      <div className="space-y-0">
        <BusinessFitItem
          icon={<DollarSign className="w-5 h-5" />}
          iconColorClass="bg-[#fbbf24] text-[#0a0a0f]"
          title="Revenue Potential"
          description={revenue.description}
          value={revenue.value}
        />
        <BusinessFitItem
          icon={<Settings className="w-5 h-5" />}
          iconColorClass="bg-[#8b5cf6] text-white"
          title="Execution Difficulty"
          description={execution.description}
          value={execution.value}
        />
        <BusinessFitItem
          icon={<Rocket className="w-5 h-5" />}
          iconColorClass="bg-[#e91e8c] text-white"
          title="Go-To-Market"
          description={gtm.description}
          value={gtm.value}
        />
        <BusinessFitItem
          icon={<Target className="w-5 h-5" />}
          iconColorClass="bg-[#f97316] text-white"
          title="Right for You?"
          description={fit.description}
          isLink={true}
        />
      </div>
    </div>
  );
}

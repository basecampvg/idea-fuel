'use client';

import { DollarSign, Settings, Rocket, Target, Clock, AlertTriangle, Users, TrendingUp } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface RevenuePotential {
  rating: 'high' | 'medium' | 'low';
  estimate: string;
  confidence: number;
  revenueModel?: string;
  timeToFirstRevenue?: string;
  unitEconomics?: string;
}

export interface ExecutionDifficulty {
  rating: 'easy' | 'moderate' | 'hard';
  factors: string[];
  soloFriendly: boolean;
  mvpTimeEstimate?: string;
  criticalPath?: string[];
  biggestRisk?: string;
}

export interface GTMClarity {
  rating: 'clear' | 'moderate' | 'unclear';
  channels: string[];
  confidence: number;
  primaryChannel?: string;
  estimatedCAC?: string;
  firstMilestone?: string;
}

export interface FounderFit {
  percentage: number;
  strengths: string[];
  gaps: string[];
  criticalSkillNeeded?: string;
  recommendedFirstHire?: string;
}

interface BusinessFitProps {
  revenuePotential?: RevenuePotential | null;
  executionDifficulty?: ExecutionDifficulty | null;
  gtmClarity?: GTMClarity | null;
  founderFit?: FounderFit | null;
  title?: string;
  subtitle?: string;
}

const ratingColors: Record<string, string> = {
  high: 'bg-green-500/10 text-green-400 border-green-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-red-500/10 text-red-400 border-red-500/20',
  easy: 'bg-green-500/10 text-green-400 border-green-500/20',
  moderate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  hard: 'bg-red-500/10 text-red-400 border-red-500/20',
  clear: 'bg-green-500/10 text-green-400 border-green-500/20',
  unclear: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function RatingBadge({ rating }: { rating: string }) {
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${ratingColors[rating] || 'bg-muted text-muted-foreground border-border'}`}>
      {rating}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const getColor = () => {
    if (value >= 70) return 'bg-green-400';
    if (value >= 40) return 'bg-amber-400';
    return 'bg-red-400';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${getColor()}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">{value}%</span>
    </div>
  );
}

function MetaStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-card border border-border">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
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

function RevenueCard({ data }: { data: RevenuePotential }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/15">
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Revenue Potential</p>
            <p className="text-xs text-muted-foreground">{data.estimate}</p>
          </div>
        </div>
        <RatingBadge rating={data.rating} />
      </div>

      <div className="mb-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Confidence</p>
        <ConfidenceBar value={data.confidence} />
      </div>

      {(data.revenueModel || data.timeToFirstRevenue || data.unitEconomics) && (
        <div className="flex flex-wrap gap-1.5">
          {data.revenueModel && (
            <MetaStat icon={<TrendingUp className="w-2.5 h-2.5 text-green-400" />} label="Model" value={data.revenueModel} />
          )}
          {data.timeToFirstRevenue && (
            <MetaStat icon={<Clock className="w-2.5 h-2.5 text-amber-400" />} label="Time to Revenue" value={data.timeToFirstRevenue} />
          )}
          {data.unitEconomics && (
            <MetaStat icon={<DollarSign className="w-2.5 h-2.5 text-blue-400" />} label="Unit Economics" value={data.unitEconomics} />
          )}
        </div>
      )}
    </div>
  );
}

function ExecutionCard({ data }: { data: ExecutionDifficulty }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/15">
            <Settings className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Execution Difficulty</p>
            <p className="text-xs text-muted-foreground">
              {data.soloFriendly ? 'Solo-friendly' : 'Team recommended'}
            </p>
          </div>
        </div>
        <RatingBadge rating={data.rating} />
      </div>

      {/* Factors */}
      {data.factors.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Key Factors</p>
          <ul className="space-y-1">
            {data.factors.map((factor, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">&#8226;</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(data.mvpTimeEstimate || data.biggestRisk) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {data.mvpTimeEstimate && (
            <MetaStat icon={<Clock className="w-2.5 h-2.5 text-blue-400" />} label="MVP Timeline" value={data.mvpTimeEstimate} />
          )}
          {data.biggestRisk && (
            <MetaStat icon={<AlertTriangle className="w-2.5 h-2.5 text-red-400" />} label="Biggest Risk" value={data.biggestRisk} />
          )}
        </div>
      )}

      {/* Critical Path */}
      {data.criticalPath && data.criticalPath.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Critical Path</p>
          <div className="space-y-1">
            {data.criticalPath.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-[10px] text-primary font-medium tabular-nums shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GTMCard({ data }: { data: GTMClarity }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/15">
            <Rocket className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Go-To-Market</p>
            {data.primaryChannel && (
              <p className="text-xs text-muted-foreground">Primary: {data.primaryChannel}</p>
            )}
          </div>
        </div>
        <RatingBadge rating={data.rating} />
      </div>

      <div className="mb-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Confidence</p>
        <ConfidenceBar value={data.confidence} />
      </div>

      {/* Channels */}
      {data.channels.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Channels</p>
          <div className="flex flex-wrap gap-1">
            {data.channels.map((channel, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-border text-muted-foreground">
                {channel}
              </span>
            ))}
          </div>
        </div>
      )}

      {(data.estimatedCAC || data.firstMilestone) && (
        <div className="space-y-1.5">
          {data.estimatedCAC && (
            <MetaStat icon={<DollarSign className="w-2.5 h-2.5 text-amber-400" />} label="Est. CAC" value={data.estimatedCAC} />
          )}
          {data.firstMilestone && (
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">First Milestone</p>
              <p className="text-xs text-foreground">{data.firstMilestone}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FounderFitCard({ data }: { data: FounderFit }) {
  const getColor = () => {
    if (data.percentage >= 70) return 'text-green-400';
    if (data.percentage >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/15">
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Founder Fit</p>
          </div>
        </div>
        <span className={`text-lg font-bold tabular-nums ${getColor()}`}>{data.percentage}%</span>
      </div>

      <div className="mb-3">
        <ConfidenceBar value={data.percentage} />
      </div>

      {/* Strengths */}
      {data.strengths.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Strengths</p>
          <ul className="space-y-1">
            {data.strengths.map((s, i) => (
              <li key={i} className="text-xs text-green-400/80 flex items-start gap-1.5">
                <span className="mt-0.5">&#10003;</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {data.gaps.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Gaps</p>
          <ul className="space-y-1">
            {data.gaps.map((g, i) => (
              <li key={i} className="text-xs text-red-400/80 flex items-start gap-1.5">
                <span className="mt-0.5">&#8594;</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(data.criticalSkillNeeded || data.recommendedFirstHire) && (
        <div className="flex flex-wrap gap-1.5">
          {data.criticalSkillNeeded && (
            <MetaStat icon={<AlertTriangle className="w-2.5 h-2.5 text-amber-400" />} label="Critical Skill" value={data.criticalSkillNeeded} />
          )}
          {data.recommendedFirstHire && (
            <MetaStat icon={<Users className="w-2.5 h-2.5 text-blue-400" />} label="First Hire" value={data.recommendedFirstHire} />
          )}
        </div>
      )}
    </div>
  );
}

export function BusinessFit({
  revenuePotential: rawRevenuePotential,
  executionDifficulty: rawExecutionDifficulty,
  gtmClarity: rawGtmClarity,
  founderFit: rawFounderFit,
  title = 'Business Fit',
  subtitle,
}: BusinessFitProps) {
  const revenuePotential = parseJson<RevenuePotential>(rawRevenuePotential);
  const executionDifficulty = parseJson<ExecutionDifficulty>(rawExecutionDifficulty);
  const gtmClarity = parseJson<GTMClarity>(rawGtmClarity);
  const founderFit = parseJson<FounderFit>(rawFounderFit);

  const hasData = revenuePotential || executionDifficulty || gtmClarity || founderFit;
  if (!hasData) return null;

  return (
    <CollapsibleSection
      icon={<Target className="w-5 h-5 text-primary" />}
      iconBgColor="hsla(270, 60%, 55%, 0.15)"
      title={title}
      subtitle={subtitle}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {revenuePotential && <RevenueCard data={revenuePotential} />}
        {executionDifficulty && <ExecutionCard data={executionDifficulty} />}
        {gtmClarity && <GTMCard data={gtmClarity} />}
        {founderFit && <FounderFitCard data={founderFit} />}
      </div>
    </CollapsibleSection>
  );
}

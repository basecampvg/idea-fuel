'use client';

import { useState } from 'react';
import type { ScoredOpportunity, MoatAuditResult, MoatAssetType } from '@forge/shared';
import { Trophy, Shield, ChevronRight, ChevronDown, TrendingUp, Target, Zap, AlertTriangle, Castle } from 'lucide-react';

interface ExpandScorecardProps {
  opportunities: ScoredOpportunity[];
  moatAudit: MoatAuditResult | null;
  onSelectOpportunity?: (opportunityId: string) => void;
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Pursue: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Explore: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  Defer: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

const DIMENSION_LABELS: Record<string, { label: string; icon: typeof TrendingUp }> = {
  operationalFit: { label: 'Operational Fit', icon: Target },
  revenuePotential: { label: 'Revenue Potential', icon: TrendingUp },
  resourceRequirement: { label: 'Resource Efficiency', icon: Zap },
  strategicRisk: { label: 'Strategic Safety', icon: AlertTriangle },
  moatStrength: { label: 'MOAT Strength', icon: Castle },
};

const MOAT_LABELS: Record<MoatAssetType, string> = {
  'customer-captivity': 'Customer Captivity',
  'inherited-distribution': 'Inherited Distribution',
  'proprietary-assets': 'Proprietary Assets',
  'cost-advantage': 'Cost Advantage',
  'network-effects': 'Network Effects',
};

function ScoreBar({ score, color = 'bg-primary' }: { score: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-7 text-right">{score}</span>
    </div>
  );
}

function CollapsibleSummary({ text, className = '' }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 280;

  if (!isLong) {
    return <p className={`text-xs text-muted-foreground leading-relaxed ${className}`}>{text}</p>;
  }

  return (
    <div className={className}>
      <p className={`text-xs text-muted-foreground leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="flex items-center gap-1 mt-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
      >
        <span>{expanded ? 'Show less' : 'Read more'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}

export function ExpandScorecard({ opportunities, moatAudit, onSelectOpportunity }: ExpandScorecardProps) {
  return (
    <div className="space-y-6">
      {/* MOAT Audit Summary */}
      {moatAudit && (
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">MOAT Profile</h3>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              Strength: {moatAudit.overallMoatStrength}/100
            </span>
          </div>
          <CollapsibleSummary text={moatAudit.summary} className="mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {moatAudit.assets.map((asset) => (
              <div key={asset.type} className="p-2 rounded-lg bg-muted/30">
                <div className="text-[10px] text-muted-foreground mb-1">{MOAT_LABELS[asset.type]}</div>
                <ScoreBar score={asset.score} color={asset.score >= 60 ? 'bg-emerald-500' : asset.score >= 30 ? 'bg-amber-500' : 'bg-zinc-500'} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold">Expansion Opportunities</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {opportunities.filter(o => o.tier === 'Pursue').length} Pursue
            {' / '}
            {opportunities.filter(o => o.tier === 'Explore').length} Explore
            {' / '}
            {opportunities.filter(o => o.tier === 'Defer').length} Defer
          </span>
        </div>

        <div className="space-y-3">
          {opportunities.map((opp, idx) => {
            const tierStyle = TIER_STYLES[opp.tier] || TIER_STYLES.Defer;
            return (
              <button
                key={opp.id}
                onClick={() => onSelectOpportunity?.(opp.id)}
                className={`w-full text-left p-4 rounded-xl bg-card border ${tierStyle.border} hover:bg-muted/30 transition-all group`}
              >
                <div className="flex items-start gap-3">
                  {/* Rank */}
                  <div className={`w-7 h-7 rounded-lg ${tierStyle.bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs font-bold ${tierStyle.text}`}>{idx + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">{opp.title}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${tierStyle.bg} ${tierStyle.text}`}>
                        {opp.tier}
                      </span>
                      <span className="ml-auto text-xs tabular-nums font-semibold text-muted-foreground flex-shrink-0">
                        {opp.overallScore}/100
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{opp.description}</p>

                    {/* Score bars */}
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(opp.scores).map(([key, value]) => {
                        const dim = DIMENSION_LABELS[key];
                        if (!dim) return null;
                        return (
                          <div key={key}>
                            <div className="text-[9px] text-muted-foreground/60 mb-0.5 truncate">{dim.label}</div>
                            <ScoreBar
                              score={value}
                              color={value >= 65 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500/70'}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* MOAT Verdict */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <Castle className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground italic line-clamp-1">{opp.moatVerdict}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

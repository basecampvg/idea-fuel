'use client';

import { Signal } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface ProofSignalsData {
  demandIndicators: string[];
  validationOpportunities: string[];
  riskFactors: string[];
  demandStrength?: {
    score: number;
    searchVolumeSignal: string;
    communitySignal: string;
    spendingSignal: string;
  };
  validationExperiments?: Array<{
    experiment: string;
    hypothesis: string;
    cost: string;
    timeframe: string;
  }>;
  riskMitigation?: Array<{
    risk: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
}

interface ProofSignalsProps {
  proofSignals?: ProofSignalsData | null;
  title?: string;
  subtitle?: string;
}

const severityColors: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

function DemandBar({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 70) return 'bg-primary';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${getColor()}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold tabular-nums text-foreground">{score}/100</span>
    </div>
  );
}

export function ProofSignals({ proofSignals, title = 'Proof Signals', subtitle }: ProofSignalsProps) {
  if (!proofSignals) return null;

  const hasContent =
    proofSignals.demandIndicators.length > 0 ||
    proofSignals.validationOpportunities.length > 0 ||
    proofSignals.riskFactors.length > 0 ||
    proofSignals.demandStrength ||
    proofSignals.validationExperiments?.length ||
    proofSignals.riskMitigation?.length;

  if (!hasContent) return null;

  return (
    <CollapsibleSection
      icon={<Signal className="w-5 h-5 text-primary" />}
      iconBgColor="hsl(var(--primary) / 0.15)"
      title={title}
      subtitle={subtitle}
    >
      <div className="space-y-5">
        {/* Demand Strength Summary */}
        {proofSignals.demandStrength && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Demand Confidence</p>
            <DemandBar score={proofSignals.demandStrength.score} />
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="p-2 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Search Volume</p>
                <p className="text-xs text-foreground/80">{proofSignals.demandStrength.searchVolumeSignal}</p>
              </div>
              <div className="p-2 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Community</p>
                <p className="text-xs text-foreground/80">{proofSignals.demandStrength.communitySignal}</p>
              </div>
              <div className="p-2 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Spending</p>
                <p className="text-xs text-foreground/80">{proofSignals.demandStrength.spendingSignal}</p>
              </div>
            </div>
          </div>
        )}

        {/* Demand Indicators */}
        {proofSignals.demandIndicators.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-muted-foreground font-mono mb-2">
              Demand Indicators
            </div>
            <ul className="space-y-1.5 mb-6">
              {proofSignals.demandIndicators.map((indicator, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">&#10003;</span>
                  <span>{indicator}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Validation Experiments */}
        {proofSignals.validationExperiments && proofSignals.validationExperiments.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-muted-foreground font-mono mb-2">
              Validation Experiments
            </div>
            <div className="space-y-2">
              {proofSignals.validationExperiments.map((exp, i) => (
                <div key={i} className="p-3 rounded-lg bg-card border border-border">
                  <p className="text-xs font-medium text-foreground mb-1">{exp.experiment}</p>
                  <p className="text-xs text-muted-foreground mb-2">{exp.hypothesis}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {exp.cost}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {exp.timeframe}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Opportunities (legacy flat list) */}
        {proofSignals.validationOpportunities.length > 0 && !proofSignals.validationExperiments?.length && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-muted-foreground font-mono mb-2">
              Validation Opportunities
            </div>
            <ul className="space-y-1.5 mb-6">
              {proofSignals.validationOpportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-accent mt-0.5">&#9733;</span>
                  <span>{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk Mitigation (rich) or Risk Factors (flat legacy) */}
        {proofSignals.riskMitigation && proofSignals.riskMitigation.length > 0 ? (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-muted-foreground font-mono mb-2">
              Risk Mitigation
            </div>
            <div className="space-y-2">
              {proofSignals.riskMitigation.map((rm, i) => (
                <div key={i} className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-foreground">{rm.risk}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${severityColors[rm.severity] || ''}`}>
                      {rm.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rm.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
        ) : proofSignals.riskFactors.length > 0 ? (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-muted-foreground font-mono mb-2">
              Risk Factors
            </div>
            <ul className="space-y-1.5 mb-6">
              {proofSignals.riskFactors.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-[#ef4444] mt-0.5">&#9888;</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

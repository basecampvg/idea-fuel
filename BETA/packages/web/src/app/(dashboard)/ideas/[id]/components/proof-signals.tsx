'use client';

import { Signal, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface ProofSignalsData {
  demandIndicators: string[];
  validationOpportunities: string[];
  riskFactors: string[];
}

interface ProofSignalsProps {
  proofSignals?: ProofSignalsData | null;
  title?: string;
  subtitle?: string;
}

export function ProofSignals({ proofSignals, title = 'Proof Signals', subtitle }: ProofSignalsProps) {
  if (!proofSignals) return null;

  const hasContent =
    proofSignals.demandIndicators.length > 0 ||
    proofSignals.validationOpportunities.length > 0 ||
    proofSignals.riskFactors.length > 0;

  if (!hasContent) return null;

  return (
    <CollapsibleSection
      icon={<Signal className="w-5 h-5 text-primary/60" />}
      iconBgColor="hsla(160, 84%, 44%, 0.2)"
      title={title}
      subtitle={subtitle}
    >
      <div className="space-y-5">
        {/* Demand Indicators */}
        {proofSignals.demandIndicators.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Demand Indicators</p>
            </div>
            <ul className="space-y-2">
              {proofSignals.demandIndicators.map((indicator, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">&#10003;</span>
                  <span>{indicator}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Validation Opportunities */}
        {proofSignals.validationOpportunities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-accent" />
              <p className="text-sm font-medium text-foreground">Validation Opportunities</p>
            </div>
            <ul className="space-y-2">
              {proofSignals.validationOpportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-accent mt-0.5">&#9733;</span>
                  <span>{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk Factors */}
        {proofSignals.riskFactors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-[#ef4444]" />
              <p className="text-sm font-medium text-foreground">Risk Factors</p>
            </div>
            <ul className="space-y-2">
              {proofSignals.riskFactors.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-[#ef4444] mt-0.5">&#9888;</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

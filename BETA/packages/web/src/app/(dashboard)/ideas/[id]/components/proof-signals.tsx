'use client';

import { Signal, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';

export interface ProofSignalsData {
  demandIndicators: string[];
  validationOpportunities: string[];
  riskFactors: string[];
}

interface ProofSignalsProps {
  proofSignals?: ProofSignalsData | null;
}

export function ProofSignals({ proofSignals }: ProofSignalsProps) {
  if (!proofSignals) return null;

  const hasContent =
    proofSignals.demandIndicators.length > 0 ||
    proofSignals.validationOpportunities.length > 0 ||
    proofSignals.riskFactors.length > 0;

  if (!hasContent) return null;

  return (
    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-[#4ecdc4]/20 flex items-center justify-center">
          <Signal className="w-5 h-5 text-[#4ecdc4]" />
        </div>
        <h2 className="text-base font-semibold text-white">Proof Signals</h2>
      </div>

      <div className="space-y-5">
        {/* Demand Indicators */}
        {proofSignals.demandIndicators.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-[#22c55e]" />
              <p className="text-sm font-medium text-white">Demand Indicators</p>
            </div>
            <ul className="space-y-2">
              {proofSignals.demandIndicators.map((indicator, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#a0a0b0]">
                  <span className="text-[#22c55e] mt-0.5">&#10003;</span>
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
              <Lightbulb className="w-4 h-4 text-[#8b5cf6]" />
              <p className="text-sm font-medium text-white">Validation Opportunities</p>
            </div>
            <ul className="space-y-2">
              {proofSignals.validationOpportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#a0a0b0]">
                  <span className="text-[#8b5cf6] mt-0.5">&#9733;</span>
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
              <p className="text-sm font-medium text-white">Risk Factors</p>
            </div>
            <ul className="space-y-2">
              {proofSignals.riskFactors.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#a0a0b0]">
                  <span className="text-[#ef4444] mt-0.5">&#9888;</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

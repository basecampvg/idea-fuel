'use client';

import { AlertCircle } from 'lucide-react';

export interface PainPoint {
  problem: string;
  severity: 'high' | 'medium' | 'low';
  currentSolutions: string[];
  gaps: string[];
}

interface PainPointsSectionProps {
  painPoints?: PainPoint[] | null;
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    high: { bg: 'bg-[#ef4444]/10', text: 'text-[#ef4444]', border: 'border-[#ef4444]/20' },
    medium: { bg: 'bg-[#f59e0b]/10', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/20' },
    low: { bg: 'bg-[#22c55e]/10', text: 'text-[#22c55e]', border: 'border-[#22c55e]/20' },
  }[severity] || { bg: 'bg-[#6a6a7a]/10', text: 'text-[#6a6a7a]', border: 'border-[#6a6a7a]/20' };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border}`}>
      {severity}
    </span>
  );
}

function PainPointCard({ painPoint }: { painPoint: PainPoint }) {
  return (
    <div className="p-4 rounded-xl bg-[#1a1a24] border border-[#1e1e2a]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-white font-medium">{painPoint.problem}</p>
        <SeverityBadge severity={painPoint.severity} />
      </div>

      {painPoint.currentSolutions.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-[#6a6a7a] mb-1">Current Solutions</p>
          <div className="flex flex-wrap gap-1">
            {painPoint.currentSolutions.map((solution, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#1e1e2a] text-[#a0a0b0]">
                {solution}
              </span>
            ))}
          </div>
        </div>
      )}

      {painPoint.gaps.length > 0 && (
        <div>
          <p className="text-xs text-[#6a6a7a] mb-1">Solution Gaps</p>
          <ul className="space-y-1">
            {painPoint.gaps.map((gap, i) => (
              <li key={i} className="text-xs text-[#f59e0b] flex items-start gap-1">
                <span>&#8594;</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PainPointsSection({ painPoints }: PainPointsSectionProps) {
  if (!painPoints || painPoints.length === 0) return null;

  // Sort by severity (high first)
  const sortedPainPoints = [...painPoints].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-[#f59e0b]/20 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-[#f59e0b]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Pain Points</h2>
          <p className="text-xs text-[#6a6a7a]">{painPoints.length} problems identified</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedPainPoints.map((painPoint, i) => (
          <PainPointCard key={i} painPoint={painPoint} />
        ))}
      </div>
    </div>
  );
}

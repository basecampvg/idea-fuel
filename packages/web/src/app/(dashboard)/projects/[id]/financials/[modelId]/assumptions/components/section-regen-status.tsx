'use client';

import { RefreshCw, Check, AlertCircle } from 'lucide-react';

interface SectionRegenStatusProps {
  impactedSections: Array<{ sectionKey: string; reportType: string }>;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

const SECTION_DISPLAY: Record<string, string> = {
  executiveSummary: 'Executive Summary',
  problem: 'Problem',
  solution: 'Solution',
  marketSize: 'Market Size',
  pricingStrategy: 'Pricing Strategy',
  customerAcquisition: 'Customer Acquisition',
  financialProjections: 'Financial Projections',
  costStructure: 'Cost Structure',
  revenueStreams: 'Revenue Streams',
  marketingStrategy: 'Marketing Strategy',
  competitiveAdvantage: 'Competitive Advantage',
};

export function SectionRegenStatus({
  impactedSections,
  isRegenerating,
  onRegenerate,
}: SectionRegenStatusProps) {
  if (impactedSections.length === 0) return null;

  // Deduplicate by sectionKey
  const unique = [...new Map(impactedSections.map((s) => [s.sectionKey, s])).values()];

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5" />
          {unique.length} section{unique.length !== 1 ? 's' : ''} may need regeneration
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
            bg-primary text-primary-foreground hover:bg-primary/90 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
          {isRegenerating ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {unique.map((section) => (
          <span
            key={section.sectionKey}
            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300"
          >
            {SECTION_DISPLAY[section.sectionKey] ?? section.sectionKey}
          </span>
        ))}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { REPORT_TYPE_LABELS, REPORT_TIER_LABELS, REPORT_STATUS_LABELS } from '@forge/shared';

interface Report {
  id: string;
  type: string;
  tier: string;
  title: string;
  status: string;
  createdAt: Date;
}

interface ReportGridProps {
  reports: Report[];
  ideaId: string;
  locked?: boolean;
}

// Report type icons
const reportIcons: Record<string, string> = {
  BUSINESS_PLAN: '📊',
  POSITIONING: '🎯',
  COMPETITIVE_ANALYSIS: '⚔️',
  WHY_NOW: '⏰',
  PROOF_SIGNALS: '📈',
  KEYWORDS_SEO: '🔍',
  CUSTOMER_PROFILE: '👤',
  VALUE_EQUATION: '💎',
  VALUE_LADDER: '📶',
  GO_TO_MARKET: '🚀',
};

// All report types for showing locked placeholders
const ALL_REPORT_TYPES = [
  'BUSINESS_PLAN',
  'POSITIONING',
  'COMPETITIVE_ANALYSIS',
  'WHY_NOW',
  'PROOF_SIGNALS',
  'KEYWORDS_SEO',
  'CUSTOMER_PROFILE',
  'VALUE_EQUATION',
  'VALUE_LADDER',
  'GO_TO_MARKET',
];

export function ReportGrid({ reports, ideaId, locked = false }: ReportGridProps) {
  // If locked, show all report types as locked cards
  if (locked) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ALL_REPORT_TYPES.map((type) => (
          <div
            key={type}
            className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] opacity-50 cursor-not-allowed"
          >
            <div className="flex flex-col items-center text-center">
              <span className="text-2xl mb-2">🔒</span>
              <span className="text-xs font-medium text-[var(--muted-foreground)] line-clamp-2">
                {REPORT_TYPE_LABELS[type] || type}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Create a map of existing reports by type
  const reportsByType = new Map(reports.map((r) => [r.type, r]));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {ALL_REPORT_TYPES.map((type) => {
        const report = reportsByType.get(type);
        const icon = reportIcons[type] || '📄';
        const isGenerating = report?.status === 'GENERATING';
        const isComplete = report?.status === 'COMPLETE';
        const isFailed = report?.status === 'FAILED';

        if (!report) {
          // No report generated for this type yet
          return (
            <div
              key={type}
              className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] opacity-50"
            >
              <div className="flex flex-col items-center text-center">
                <span className="text-2xl mb-2 grayscale">{icon}</span>
                <span className="text-xs font-medium text-[var(--muted-foreground)] line-clamp-2">
                  {REPORT_TYPE_LABELS[type] || type}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)]/60 mt-1">
                  Not generated
                </span>
              </div>
            </div>
          );
        }

        if (isGenerating) {
          return (
            <div
              key={type}
              className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] animate-pulse"
            >
              <div className="flex flex-col items-center text-center">
                <span className="text-2xl mb-2">{icon}</span>
                <span className="text-xs font-medium text-[var(--foreground)] line-clamp-2">
                  {REPORT_TYPE_LABELS[type] || type}
                </span>
                <span className="text-[10px] text-blue-400 mt-1">Generating...</span>
              </div>
            </div>
          );
        }

        if (isFailed) {
          return (
            <div
              key={type}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
            >
              <div className="flex flex-col items-center text-center">
                <span className="text-2xl mb-2">{icon}</span>
                <span className="text-xs font-medium text-[var(--foreground)] line-clamp-2">
                  {REPORT_TYPE_LABELS[type] || type}
                </span>
                <span className="text-[10px] text-red-400 mt-1">Failed</span>
              </div>
            </div>
          );
        }

        // Complete - clickable
        return (
          <Link
            key={type}
            href={`/reports/${report.id}`}
            className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--card-bg-hover)] transition-all group"
          >
            <div className="flex flex-col items-center text-center">
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{icon}</span>
              <span className="text-xs font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                {REPORT_TYPE_LABELS[type] || type}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)] mt-1">
                {REPORT_TIER_LABELS[report.tier] || report.tier}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

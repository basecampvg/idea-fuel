'use client';

import Link from 'next/link';
import { REPORT_TYPE_LABELS, REPORT_TIER_LABELS, REPORT_STATUS_LABELS } from '@forge/shared';
import {
  BarChart3,
  Target,
  Swords,
  Clock,
  TrendingUp,
  Search,
  User,
  Gem,
  Signal,
  Rocket,
  FileText,
  Lock,
  type LucideIcon,
} from 'lucide-react';

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

// Report type icons using Lucide React
const reportIcons: Record<string, LucideIcon> = {
  BUSINESS_PLAN: BarChart3,
  POSITIONING: Target,
  COMPETITIVE_ANALYSIS: Swords,
  WHY_NOW: Clock,
  PROOF_SIGNALS: TrendingUp,
  KEYWORDS_SEO: Search,
  CUSTOMER_PROFILE: User,
  VALUE_EQUATION: Gem,
  VALUE_LADDER: Signal,
  GO_TO_MARKET: Rocket,
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
            className="p-4 rounded-xl bg-card border border-border opacity-50 cursor-not-allowed"
          >
            <div className="flex flex-col items-center text-center">
              <Lock className="w-6 h-6 mb-2 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground line-clamp-2">
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
        const Icon = reportIcons[type] || FileText;
        const isGenerating = report?.status === 'GENERATING';
        const isComplete = report?.status === 'COMPLETE';
        const isFailed = report?.status === 'FAILED';

        if (!report) {
          // No report generated for this type yet
          return (
            <div
              key={type}
              className="p-4 rounded-xl bg-card border border-border opacity-50"
            >
              <div className="flex flex-col items-center text-center">
                <Icon className="w-6 h-6 mb-2 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground line-clamp-2">
                  {REPORT_TYPE_LABELS[type] || type}
                </span>
                <span className="text-xs text-muted-foreground/60 mt-1">
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
              className="p-4 rounded-xl bg-card border border-border animate-pulse"
            >
              <div className="flex flex-col items-center text-center">
                <Icon className="w-6 h-6 mb-2 text-primary" />
                <span className="text-xs font-medium text-foreground line-clamp-2">
                  {REPORT_TYPE_LABELS[type] || type}
                </span>
                <span className="text-xs text-info mt-1">Generating...</span>
              </div>
            </div>
          );
        }

        if (isFailed) {
          return (
            <div
              key={type}
              className="p-4 rounded-xl bg-destructive/10 border border-destructive/30"
            >
              <div className="flex flex-col items-center text-center">
                <Icon className="w-6 h-6 mb-2 text-destructive" />
                <span className="text-xs font-medium text-foreground line-clamp-2">
                  {REPORT_TYPE_LABELS[type] || type}
                </span>
                <span className="text-xs text-destructive mt-1">Failed</span>
              </div>
            </div>
          );
        }

        // Complete - clickable
        return (
          <Link
            key={type}
            href={`/reports/${report.id}`}
            className="p-4 rounded-xl bg-card border border-border hover:border-accent/30 hover:bg-muted transition-all group"
          >
            <div className="flex flex-col items-center text-center">
              <Icon className="w-6 h-6 mb-2 text-accent group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2">
                {REPORT_TYPE_LABELS[type] || type}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {REPORT_TIER_LABELS[report.tier] || report.tier}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

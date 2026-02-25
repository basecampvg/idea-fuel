'use client';

import Link from 'next/link';
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
  type LucideIcon,
} from 'lucide-react';
import {
  REPORT_TYPE_LABELS,
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TIER_LABELS,
  REPORT_STATUS_LABELS,
} from '@forge/shared';

type ReportStatus = 'DRAFT' | 'GENERATING' | 'COMPLETE' | 'FAILED';

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

// Status styling config
const statusConfig: Record<ReportStatus, { color: string; bgColor: string }> = {
  DRAFT: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
  },
  GENERATING: {
    color: 'text-info',
    bgColor: 'bg-info/15',
  },
  COMPLETE: {
    color: 'text-success',
    bgColor: 'bg-success/15',
  },
  FAILED: {
    color: 'text-destructive',
    bgColor: 'bg-destructive/15',
  },
};

// Tier styling config
const tierConfig: Record<string, { color: string; bgColor: string }> = {
  BASIC: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
  },
  PRO: {
    color: 'text-accent',
    bgColor: 'bg-accent/15',
  },
  FULL: {
    color: 'text-primary',
    bgColor: 'bg-primary/15',
  },
};

interface ReportHeaderProps {
  report: {
    id: string;
    type: string;
    tier: string;
    status: string;
    title: string;
    version: number;
    createdAt: Date;
    projectId: string;
    project?: {
      id: string;
      title: string;
      description?: string | null;
    } | null;
  };
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const Icon = reportIcons[report.type] || FileText;
  const status = statusConfig[report.status as ReportStatus] || statusConfig.DRAFT;
  const tier = tierConfig[report.tier] || tierConfig.BASIC;

  // Get project title for back link
  const projectTitle = report.project?.title || report.project?.description?.slice(0, 40) || 'Project';
  const truncatedProjectTitle = projectTitle.length > 30 ? projectTitle.slice(0, 30) + '...' : projectTitle;

  return (
    <div>
      {/* Back navigation */}
      <Link
        href={`/projects/${report.projectId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to {truncatedProjectTitle}
      </Link>

      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title with icon and badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {REPORT_TYPE_LABELS[report.type] || report.type}
                </h1>
              </div>

              {/* Status badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                <span>{REPORT_STATUS_LABELS[report.status] || report.status}</span>
              </div>

              {/* Tier badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tier.bgColor} ${tier.color}`}>
                <span>{REPORT_TIER_LABELS[report.tier] || report.tier}</span>
              </div>
            </div>

            {/* Description */}
            <p className="mt-2 text-sm text-muted-foreground">
              {REPORT_TYPE_DESCRIPTIONS[report.type]}
            </p>

            {/* Metadata */}
            <p className="mt-1.5 text-xs text-muted-foreground/60">
              Version {report.version} • Generated{' '}
              {new Date(report.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

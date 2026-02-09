'use client';

import { useState } from 'react';
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
  Download,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import {
  REPORT_TYPE_LABELS,
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TIER_LABELS,
  REPORT_STATUS_LABELS,
} from '@forge/shared';
import { trpc } from '@/lib/trpc/client';

type ReportStatus = 'DRAFT' | 'GENERATING' | 'COMPLETE' | 'FAILED';
type ReportType =
  | 'BUSINESS_PLAN'
  | 'POSITIONING'
  | 'COMPETITIVE_ANALYSIS'
  | 'WHY_NOW'
  | 'PROOF_SIGNALS'
  | 'KEYWORDS_SEO'
  | 'CUSTOMER_PROFILE'
  | 'VALUE_EQUATION'
  | 'VALUE_LADDER'
  | 'GO_TO_MARKET';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const Icon = reportIcons[report.type] || FileText;
  const status = statusConfig[report.status as ReportStatus] || statusConfig.DRAFT;
  const tier = tierConfig[report.tier] || tierConfig.BASIC;

  const downloadPDF = trpc.report.downloadPDF.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and trigger download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsDownloading(false);
      setDownloadError(null);
    },
    onError: (err) => {
      console.error('PDF download error:', err);
      setDownloadError(err.message || 'Failed to generate PDF');
      setIsDownloading(false);
    },
  });

  const handleDownload = () => {
    setIsDownloading(true);
    setDownloadError(null);
    downloadPDF.mutate({
      projectId: report.projectId,
      reportType: report.type as ReportType,
    });
  };

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

          {/* Download PDF button */}
          {report.status === 'COMPLETE' && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                downloadError
                  ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                  : 'bg-accent/15 text-accent hover:bg-accent/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : downloadError ? (
                <>
                  <Download className="w-4 h-4" />
                  <span>Retry Download</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Download error message */}
        {downloadError && (
          <p className="mt-2 text-xs text-destructive">{downloadError}</p>
        )}
      </div>
    </div>
  );
}

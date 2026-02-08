'use client';

import { use } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import { REPORT_TIER_LABELS, REPORT_TIER_DESCRIPTIONS } from '@forge/shared';
import { ReportHeader } from './components/report-header';
import { ReportContent } from './components/report-content';

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: report, isLoading, error } = trpc.report.get.useQuery({ id });

  if (isLoading) {
    return <LoadingScreen message="Loading report..." />;
  }

  if (error || !report) {
    return (
      <div className="w-full max-w-[1120px] mx-auto px-6 py-8">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Vault
        </Link>
        <div className="mt-6 glass-card p-6 border-destructive/30">
          <p className="text-destructive">{error?.message || 'Report not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 max-w-[1120px] mx-auto px-6 py-8">
      {/* Header with back navigation, title, badges, and download button */}
      <ReportHeader report={report} />

      {/* Metadata cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        {/* Project link */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Source Project</p>
          <Link
            href={`/projects/${report.projectId}`}
            className="text-sm font-medium text-accent hover:text-accent/80 transition-colors line-clamp-1"
          >
            {report.project?.title || 'View Project'}
          </Link>
        </div>

        {/* Tier */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Report Tier</p>
          <p className="text-sm font-medium text-foreground">
            {REPORT_TIER_LABELS[report.tier] || report.tier}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {REPORT_TIER_DESCRIPTIONS[report.tier]}
          </p>
        </div>

        {/* Version */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Version</p>
          <p className="text-sm font-medium text-foreground">v{report.version}</p>
        </div>

        {/* Generated date */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Generated</p>
          <p className="text-sm font-medium text-foreground">
            {new Date(report.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Report Status States */}
      {report.status === 'GENERATING' && (
        <div className="glass-card p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-info/20 flex items-center justify-center mb-4">
              <div className="w-6 h-6 border-2 border-info border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-foreground font-medium">Generating Report</p>
            <p className="text-sm text-muted-foreground mt-1">
              AI is analyzing your data and creating insights...
            </p>
          </div>
        </div>
      )}

      {report.status === 'FAILED' && (
        <div className="glass-card p-6 border-destructive/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Report Generation Failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                Something went wrong while generating this report. Please try regenerating it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Report Content - only show for COMPLETE status */}
      {report.status === 'COMPLETE' && (
        <ReportContent report={report} />
      )}

      {/* Draft state */}
      {report.status === 'DRAFT' && (
        <div className="glass-card p-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-foreground font-medium">Report Draft</p>
            <p className="text-sm text-muted-foreground mt-1">
              This report hasn't been generated yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

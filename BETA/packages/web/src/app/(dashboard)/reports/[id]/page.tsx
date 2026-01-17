'use client';

import { use } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/spinner';
import {
  REPORT_TYPE_LABELS,
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TIER_LABELS,
  REPORT_STATUS_LABELS,
} from '@forge/shared';

type ReportStatus = 'DRAFT' | 'GENERATING' | 'COMPLETE' | 'FAILED';

const statusVariants: Record<ReportStatus, 'default' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'default',
  GENERATING: 'warning',
  COMPLETE: 'success',
  FAILED: 'error',
};

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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error?.message || 'Report not found'}
      </div>
    );
  }

  // Parse content - could be markdown or JSON
  let contentHtml = report.content;
  // For now, we'll display as preformatted text
  // TODO: Add proper markdown rendering

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/reports"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {REPORT_TYPE_LABELS[report.type] || report.type}
              </h1>
              <Badge variant={statusVariants[report.status as ReportStatus]}>
                {REPORT_STATUS_LABELS[report.status] || report.status}
              </Badge>
            </div>
            <p className="mt-1 text-gray-500">
              {REPORT_TYPE_DESCRIPTIONS[report.type]}
            </p>
          </div>
          <div className="flex gap-2">
            {report.pdfUrl && (
              <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download PDF
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Idea</p>
            <Link
              href={`/ideas/${report.ideaId}`}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              {report.idea?.title || 'View Idea'}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Tier</p>
            <p className="font-medium text-gray-900">
              {REPORT_TIER_LABELS[report.tier] || report.tier}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Version</p>
            <p className="font-medium text-gray-900">v{report.version}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Generated</p>
            <p className="font-medium text-gray-900">
              {new Date(report.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Content */}
      <Card>
        <CardHeader>
          <CardTitle>{report.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {report.status === 'GENERATING' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="mt-4 text-gray-500">Generating report...</p>
            </div>
          ) : report.status === 'FAILED' ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">
              <p className="font-medium">Report generation failed</p>
              <p className="text-sm">Please try generating this report again.</p>
            </div>
          ) : (
            <div className="prose prose-gray max-w-none">
              {/* TODO: Render markdown properly */}
              <div className="whitespace-pre-wrap">{report.content}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sections (if available) */}
      {report.sections && typeof report.sections === 'object' && (
        <Card>
          <CardHeader>
            <CardTitle>Report Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(report.sections as Record<string, unknown>).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <span className="text-gray-700">{key.replace(/_/g, ' ')}</span>
                    <Badge variant={value ? 'success' : 'default'}>
                      {value ? 'Included' : 'Not included'}
                    </Badge>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

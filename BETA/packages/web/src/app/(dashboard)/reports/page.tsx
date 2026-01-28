'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  REPORT_TYPE_LABELS,
  REPORT_TIER_LABELS,
  REPORT_STATUS_LABELS,
} from '@forge/shared';

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

type ReportStatus = 'DRAFT' | 'GENERATING' | 'COMPLETE' | 'FAILED';

const statusVariants: Record<ReportStatus, 'default' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'default',
  GENERATING: 'warning',
  COMPLETE: 'success',
  FAILED: 'error',
};

export default function ReportsPage() {
  const [typeFilter, setTypeFilter] = useState<ReportType | 'ALL'>('ALL');
  // Note: The backend doesn't support type filtering yet, so we filter client-side
  const { data, isLoading, error } = trpc.report.list.useQuery({});

  if (isLoading) {
    return <LoadingScreen message="Loading reports..." />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Failed to load reports: {error.message}
      </div>
    );
  }

  const allReports = data?.items ?? [];
  // Client-side filtering since backend doesn't support type filter
  const reports = typeFilter === 'ALL' ? allReports : allReports.filter((r) => r.type === typeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="mt-1 text-gray-500">
          View and download your generated business reports
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter('ALL')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            typeFilter === 'ALL'
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          All Reports
        </button>
        {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              typeFilter === type
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {REPORT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
          title="No reports yet"
          description="Reports are generated after completing research on your ideas"
          action={
            <Link href="/ideas">
              <Button>View Your Ideas</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col justify-between py-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-gray-900">
                        {REPORT_TYPE_LABELS[report.type] || report.type}
                      </h3>
                      <Badge variant={statusVariants[report.status as ReportStatus]}>
                        {REPORT_STATUS_LABELS[report.status] || report.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{report.title}</p>
                    <p className="mt-2 text-xs text-gray-400">
                      {report.idea?.title}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant="default">
                      {REPORT_TIER_LABELS[report.tier] || report.tier}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination info */}
      {data && data.pagination.total > 0 && (
        <p className="text-center text-sm text-gray-500">
          Showing {reports.length} of {data.pagination.total} reports
        </p>
      )}
    </div>
  );
}

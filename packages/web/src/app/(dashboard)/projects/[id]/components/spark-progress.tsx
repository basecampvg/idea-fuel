'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Sparkles,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  SPARK_STATUS_LABELS,
  SPARK_STATUS_DESCRIPTIONS,
  SPARK_STATUS_PROGRESS,
} from '@forge/shared';

interface SparkProgressProps {
  jobId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

// Status config with icons and colors
function getStatusConfig(status: string | null) {
  switch (status) {
    case 'QUEUED':
      return {
        Icon: Loader2,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
        animate: true,
      };
    case 'RUNNING_KEYWORDS':
      return {
        Icon: Search,
        color: 'text-primary/70',
        bgColor: 'bg-primary/10',
        animate: true,
      };
    case 'RUNNING_RESEARCH': // Legacy
    case 'RUNNING_PARALLEL':
      return {
        Icon: Sparkles,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        animate: true,
      };
    case 'SYNTHESIZING':
      return {
        Icon: Sparkles,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        animate: true,
      };
    case 'COMPLETE':
    case 'PARTIAL_COMPLETE':
      return {
        Icon: CheckCircle2,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        animate: false,
      };
    case 'FAILED':
      return {
        Icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        animate: false,
      };
    default:
      return {
        Icon: Loader2,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
        animate: true,
      };
  }
}

// Progress steps (matches actual pipeline: keywords → parallel research → synthesis → done)
const progressSteps = [
  { status: 'QUEUED', label: 'Queued', Icon: Loader2 },
  { status: 'RUNNING_KEYWORDS', label: 'Generating Keywords', Icon: Search },
  { status: 'RUNNING_PARALLEL', label: 'Researching', Icon: Sparkles },
  { status: 'SYNTHESIZING', label: 'Analyzing Results', Icon: Sparkles },
  { status: 'COMPLETE', label: 'Complete', Icon: CheckCircle2 },
];

// Map legacy statuses to their equivalent step
function normalizeStatus(status: string | null | undefined): string {
  if (status === 'RUNNING_RESEARCH' || status === 'ENRICHING') return 'RUNNING_PARALLEL';
  if (status === 'PARTIAL_COMPLETE') return 'COMPLETE';
  return status || 'QUEUED';
}

// Interpolate progress within a phase based on elapsed time
function interpolateProgress(
  status: string | null | undefined,
  dbProgress: number,
  startedAt: Date | string | null,
): number {
  if (!status || !startedAt) return dbProgress;

  const range = SPARK_STATUS_PROGRESS[status];
  if (!range || range.start === range.end) return range?.start ?? dbProgress;

  // Estimate time per phase (rough) to create smooth interpolation
  const phaseMaxSeconds: Record<string, number> = {
    QUEUED: 10,
    RUNNING_KEYWORDS: 30,
    RUNNING_PARALLEL: 600, // 10 minutes max
    RUNNING_RESEARCH: 600,
    SYNTHESIZING: 120,     // 2 minutes
    ENRICHING: 60,
  };

  const maxSec = phaseMaxSeconds[status] || 120;
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;

  // Use an easing function so progress starts fast then slows (never reaches 100% of range)
  const t = Math.min(elapsed / maxSec, 0.95);
  const eased = 1 - Math.pow(1 - t, 2); // ease-out quadratic

  return Math.round(range.start + (range.end - range.start) * eased);
}

function formatDuration(startedAt: Date | string | null): string {
  if (!startedAt) return '';
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffMins > 0) {
    return `${diffMins}m ${diffSecs % 60}s`;
  }
  return `${diffSecs}s`;
}

export function SparkProgress({ jobId, onComplete, onError }: SparkProgressProps) {
  const [pollEnabled, setPollEnabled] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const { data, isLoading, error, refetch } = trpc.research.pollSpark.useQuery(
    { jobId },
    {
      enabled: pollEnabled,
      refetchInterval: pollEnabled ? 3000 : false, // Poll every 3 seconds
    }
  );

  // Handle completion/failure
  useEffect(() => {
    if (data?.isComplete) {
      setPollEnabled(false);
      onComplete?.();
    } else if (data?.isFailed) {
      setPollEnabled(false);
      onError?.(data.error || 'Spark validation failed');
    }
  }, [data?.isComplete, data?.isFailed, data?.error, onComplete, onError]);

  // Update elapsed time
  useEffect(() => {
    if (!data?.startedAt || data?.isComplete || data?.isFailed) return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.startedAt, data?.isComplete, data?.isFailed]);

  const statusConfig = getStatusConfig(data?.status ?? null);
  const normalized = normalizeStatus(data?.status);
  const currentStepIndex = progressSteps.findIndex((s) => s.status === normalized);
  const displayProgress = interpolateProgress(data?.status, data?.progress ?? 0, data?.startedAt ?? null);

  if (isLoading && !data) {
    return (
      <div className="rounded-2xl bg-background border border-border p-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-background border border-red-500/30 p-6">
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-red-500">Failed to load progress</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-background border border-border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary/50" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {SPARK_STATUS_LABELS[data?.status ?? ''] || 'Spark Validation'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {SPARK_STATUS_DESCRIPTIONS[data?.status ?? ''] || 'Quick market validation in progress'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-1000 shadow-[0_0_10px_hsla(160,84%,44%,0.5)]"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{displayProgress}% complete</span>
          {data?.startedAt && !data?.isComplete && !data?.isFailed && (
            <span>Elapsed: {formatDuration(data.startedAt)}</span>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-2">
        {progressSteps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex || normalized === 'COMPLETE';
          const isFailed = data?.status === 'FAILED' && index === currentStepIndex;
          const StepIcon = step.Icon;

          return (
            <div
              key={step.status}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-primary/10 border border-primary/30'
                  : isComplete
                  ? 'bg-primary/5'
                  : isFailed
                  ? 'bg-red-500/10 border border-red-500/30'
                  : 'bg-muted/30'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isComplete
                    ? 'bg-primary/20 text-primary'
                    : isActive
                    ? 'bg-primary/20 text-primary'
                    : isFailed
                    ? 'bg-red-500/20 text-red-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isFailed ? (
                  <XCircle className="h-4 w-4" />
                ) : isActive ? (
                  <StepIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </div>
              <span
                className={`text-sm ${
                  isActive || isComplete ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
              {isActive && (
                <span className="ml-auto text-xs text-primary/50 font-medium animate-pulse">In Progress</span>
              )}
              {isComplete && (
                <span className="ml-auto text-xs text-primary font-medium">Done</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {data?.isFailed && data.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-500">Validation Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{data.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {data?.isComplete && (
        <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <p className="font-medium text-primary">
              {data.isPartial ? 'Validation Complete (Partial Data)' : 'Validation Complete!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useProject } from '../components/use-project-section';
import { KeywordChart, type KeywordTrend } from '../components/keyword-chart';
import { SectionEmptyState } from '../components/section-empty-state';

function formatGrowth(growth: number): string {
  if (growth >= 500) return '+500%';
  if (growth > 0) return `+${growth}%`;
  return `${growth}%`;
}

export default function KeywordTrendsPage() {
  const { project } = useProject();

  const keywords = project?.research?.keywords as
    | { primary: string[]; secondary: string[]; longTail: string[] }
    | null
    | undefined;
  const keywordTrends = project?.research?.keywordTrends as KeywordTrend[] | null | undefined;

  if (!keywords && !keywordTrends) return <SectionEmptyState section="Keyword Trends" />;

  return (
    <div className="space-y-8">
      {/* Keyword groups */}
      {keywords && (
        <div className="rounded-2xl bg-background border border-border p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Keyword Trends</h2>

          {keywords.primary?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Primary ({keywords.primary.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {keywords.primary.map((k) => (
                  <span
                    key={k}
                    className="rounded bg-primary/10 px-2 py-1 text-xs text-primary/80"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {keywords.secondary?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Secondary ({keywords.secondary.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {keywords.secondary.map((k) => (
                  <span
                    key={k}
                    className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {keywords.longTail?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Long-Tail ({keywords.longTail.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {keywords.longTail.map((k) => (
                  <span
                    key={k}
                    className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trend chart */}
      {keywordTrends && keywordTrends.length > 0 && (
        <>
          <KeywordChart keywordTrends={keywordTrends} />

          {/* Trend summary cards */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Trends ({keywordTrends.length})
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {keywordTrends.map((kt) => (
                <div
                  key={kt.keyword}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <p className="text-sm font-bold text-foreground">{kt.keyword}</p>
                  <p className="text-xs text-muted-foreground">
                    Volume: {kt.volume.toLocaleString()} &middot; Growth:{' '}
                    {formatGrowth(kt.growth)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

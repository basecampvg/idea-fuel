'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { TrendingUp, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function DailyPickHistoryPage() {
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = trpc.dailyPick.listHistory.useQuery({
    limit,
    offset,
  });

  if (isLoading) {
    return <LoadingScreen message="Loading pick history..." />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Failed to load history: {error.message}
      </div>
    );
  }

  const { picks, total, hasMore } = data || { picks: [], total: 0, hasMore: false };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/daily-pick"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Today
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Pick History
            </h1>
            <p className="mt-1 text-muted-foreground">
              Past daily trend picks ({total} total)
            </p>
          </div>
        </div>
      </div>

      {/* Picks List */}
      {picks.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-8 w-8" />}
          title="No picks yet"
          description="Daily picks will appear here after running the trend pick job."
        />
      ) : (
        <div className="space-y-4">
          {picks.map((pick) => (
            <Link key={pick.id} href={`/daily-pick/${pick.dateLocal}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-20 text-center">
                        <p className="text-2xl font-semibold text-foreground">
                          {new Date(pick.dateLocal + 'T12:00:00').getDate()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(pick.dateLocal + 'T12:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="border-l border-border pl-4">
                        <p className="font-medium text-foreground">
                          {pick.winnerCluster.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {pick.winnerCluster.canonicalQuery}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        <Badge variant="success">
                          Score: {pick.winnerCluster.combinedScore.toFixed(1)}
                        </Badge>
                        <Badge variant="info">
                          Growth: {pick.winnerCluster.growthScore}
                        </Badge>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </span>
          <Button
            variant="outline"
            onClick={() => setOffset(offset + limit)}
            disabled={!hasMore}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

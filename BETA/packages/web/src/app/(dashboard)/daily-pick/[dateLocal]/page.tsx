'use client';

import { use } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  TrendingUp,
  ChevronLeft,
  Target,
  ShoppingCart,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface WinnerReport {
  title: string;
  canonical_query: string;
  cluster_members: string[];
  one_line_thesis: string;
  demand_signals: {
    growth_score: number;
    purchase_proof_score: number;
    summary: string;
  };
  pain_point: {
    who: string;
    problem_statement: string;
    why_now: string;
  };
  purchase_proof: {
    buy_stage: string;
    evidence: string[];
  };
  suggested_angles: Array<{
    angle: string;
    rationale: string;
  }>;
  next_step: {
    recommended_mode: string;
    prompt_seed: string;
  };
  transparency: {
    winner_reason: string[];
    evidence: string[];
  };
}

interface TrendPoint {
  ts: string;
  value: number;
}

export default function DailyPickByDatePage({
  params,
}: {
  params: Promise<{ dateLocal: string }>;
}) {
  const { dateLocal } = use(params);

  const { data, isLoading, error } = trpc.dailyPick.getByDate.useQuery({
    dateLocal,
  });

  const formattedDate = new Date(dateLocal + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading) {
    return <LoadingScreen message="Loading pick..." />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Failed to load pick: {error.message}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/daily-pick/history"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            History
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              {formattedDate}
            </h1>
          </div>
        </div>

        <EmptyState
          icon={<TrendingUp className="h-8 w-8" />}
          title="No pick for this date"
          description="No daily trend pick was recorded for this date."
        />
      </div>
    );
  }

  const { cluster, report: reportJson, trendPoints } = data;
  const report = reportJson as WinnerReport | null;
  const chartData = (trendPoints as TrendPoint[]).map((p) => ({
    date: new Date(p.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: p.value,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/daily-pick/history"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          History
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            {formattedDate}
          </h1>
          <p className="mt-1 text-muted-foreground">Archived daily trend pick</p>
        </div>
      </div>

      {/* Main Pick Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{report?.title || cluster.title}</CardTitle>
              <p className="text-muted-foreground mt-1">{cluster.canonicalQuery}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="success">
                Score: {cluster.combinedScore.toFixed(1)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* One-line thesis */}
          {report?.one_line_thesis && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-lg font-medium text-foreground">
                {report.one_line_thesis}
              </p>
            </div>
          )}

          {/* Trend Chart */}
          {chartData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Growth</span>
              </div>
              <p className="text-2xl font-semibold">{cluster.growthScore}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs">Purchase Proof</span>
              </div>
              <p className="text-2xl font-semibold">{cluster.purchaseProofScore}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs">Pain Point</span>
              </div>
              <p className="text-2xl font-semibold">{cluster.painPointScore}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">News Risk</span>
              </div>
              <p className="text-2xl font-semibold">{(cluster.newsSpikeRisk * 100).toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Details */}
      {report && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pain Point */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Pain Point
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Who</span>
                <p className="font-medium">{report.pain_point.who}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Problem</span>
                <p>{report.pain_point.problem_statement}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Why Now</span>
                <p>{report.pain_point.why_now}</p>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Proof */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Purchase Proof
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Buy Stage</span>
                <p className="font-medium capitalize">{report.purchase_proof.buy_stage}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Evidence</span>
                <ul className="list-disc list-inside space-y-1">
                  {report.purchase_proof.evidence.map((e, i) => (
                    <li key={i} className="text-sm">{e}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Angles */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Suggested Angles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {report.suggested_angles.map((angle, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-2">{angle.angle}</p>
                    <p className="text-sm text-muted-foreground">{angle.rationale}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Step */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Next Step
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant="info" className="capitalize">
                  {report.next_step.recommended_mode} Mode
                </Badge>
                <p className="text-muted-foreground">{report.next_step.prompt_seed}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cluster Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Related Queries ({(cluster.memberQueries as string[]).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(cluster.memberQueries as string[]).map((query, i) => (
              <Badge key={i} variant="outline">
                {query}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transparency */}
      {report?.transparency && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Why This Pick Won</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-xs text-muted-foreground">Reasons</span>
              <ul className="list-disc list-inside space-y-1 mt-1">
                {report.transparency.winner_reason.map((reason, i) => (
                  <li key={i} className="text-sm">{reason}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Evidence</span>
              <ul className="list-disc list-inside space-y-1 mt-1">
                {report.transparency.evidence.map((e, i) => (
                  <li key={i} className="text-sm">{e}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

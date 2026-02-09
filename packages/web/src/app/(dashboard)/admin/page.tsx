'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/spinner';
import {
  Settings,
  Cpu,
  MessageSquare,
  Search,
  Users,
  ToggleLeft,
  Globe,
  RefreshCw,
  History,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  BarChart3,
  LayoutGrid,
  Eye,
  EyeOff,
  DollarSign,
  Zap,
  Activity,
  TrendingUp,
  Play,
  Clock,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

type ConfigValue = string | number | boolean | string[];

interface ConfigItem {
  key: string;
  value: ConfigValue;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'SELECT';
  label: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
}

// Dashboard pane grouping
interface PaneConfig {
  visible: ConfigItem;
  title: ConfigItem;
  subtitle: ConfigItem;
}

// Human-readable pane names
const PANE_DISPLAY_NAMES: Record<string, string> = {
  userStory: 'User Story',
  downloads: 'Downloads',
  scoreCards: 'Score Cards',
  keywordChart: 'Keyword Chart',
  businessFit: 'Business Fit',
  offerSection: 'Offer Section',
  actionPrompts: 'Action Prompts',
  marketAnalysis: 'Market Analysis',
  whyNow: 'Why Now',
  proofSignals: 'Proof Signals',
  socialProof: 'Social Proof',
  competitors: 'Competitors',
  painPoints: 'Pain Points',
};

// Group dashboard configs by pane name
function groupDashboardPaneConfigs(configs: ConfigItem[]): [string, PaneConfig][] {
  const panes: Record<string, Partial<PaneConfig>> = {};

  for (const config of configs) {
    // Parse: dashboard.panes.scoreCards -> scoreCards
    // Parse: dashboard.panes.scoreCards.title -> scoreCards
    const match = config.key.match(/^dashboard\.panes\.(\w+)(\.(\w+))?$/);
    if (match) {
      const paneName = match[1];
      const subKey = match[3]; // title, subtitle, or undefined

      if (!panes[paneName]) {
        panes[paneName] = {};
      }

      if (!subKey) {
        panes[paneName].visible = config;
      } else if (subKey === 'title') {
        panes[paneName].title = config;
      } else if (subKey === 'subtitle') {
        panes[paneName].subtitle = config;
      }
    }
  }

  // Filter to only complete pane configs and return as entries
  return Object.entries(panes).filter(
    ([, pane]) => pane.visible && pane.title && pane.subtitle
  ) as [string, PaneConfig][];
}

// Dashboard Pane Card Component
interface DashboardPaneCardProps {
  paneName: string;
  config: PaneConfig;
  onSave: (key: string, value: ConfigValue) => void;
  isSaving: boolean;
}

function DashboardPaneCard({ paneName, config, onSave, isSaving }: DashboardPaneCardProps) {
  const [titleValue, setTitleValue] = useState(String(config.title.value || ''));
  const [subtitleValue, setSubtitleValue] = useState(String(config.subtitle.value || ''));
  const [titleDirty, setTitleDirty] = useState(false);
  const [subtitleDirty, setSubtitleDirty] = useState(false);

  const isVisible = config.visible.value === true || config.visible.value === 'true';
  const displayName = PANE_DISPLAY_NAMES[paneName] || paneName;

  // Sync local state with config changes
  useEffect(() => {
    setTitleValue(String(config.title.value || ''));
    setSubtitleValue(String(config.subtitle.value || ''));
  }, [config.title.value, config.subtitle.value]);

  const handleToggleVisibility = useCallback(() => {
    onSave(config.visible.key, !isVisible);
  }, [config.visible.key, isVisible, onSave]);

  const handleTitleBlur = useCallback(() => {
    if (titleDirty && titleValue !== config.title.value) {
      onSave(config.title.key, titleValue);
      setTitleDirty(false);
    }
  }, [titleDirty, titleValue, config.title.key, config.title.value, onSave]);

  const handleSubtitleBlur = useCallback(() => {
    if (subtitleDirty && subtitleValue !== config.subtitle.value) {
      onSave(config.subtitle.key, subtitleValue);
      setSubtitleDirty(false);
    }
  }, [subtitleDirty, subtitleValue, config.subtitle.key, config.subtitle.value, onSave]);

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      isVisible
        ? 'border-border bg-background'
        : 'border-border/50 bg-muted/30 opacity-60'
    }`}>
      {/* Header with pane name and visibility toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {isVisible ? (
            <Eye className="w-4 h-4 text-primary" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">{displayName}</span>
        </div>
        <button
          onClick={handleToggleVisibility}
          disabled={isSaving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isVisible ? 'bg-primary' : 'bg-muted'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isVisible ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Content with title and subtitle inputs */}
      <div className="p-4 space-y-4">
        {/* Title field */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Title
          </label>
          <Input
            value={titleValue}
            onChange={(e) => {
              setTitleValue(e.target.value);
              setTitleDirty(true);
            }}
            onBlur={handleTitleBlur}
            placeholder="Enter title..."
            className="h-9"
            disabled={isSaving}
          />
        </div>

        {/* Subtitle field */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Subtitle <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <Input
            value={subtitleValue}
            onChange={(e) => {
              setSubtitleValue(e.target.value);
              setSubtitleDirty(true);
            }}
            onBlur={handleSubtitleBlur}
            placeholder="Enter subtitle..."
            className="h-9"
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  );
}

// Daily Pick Control Component
function DailyPickControl() {
  const utils = trpc.useUtils();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    runId: string;
    winnerClusterId: string | null;
    error?: string;
    metrics?: {
      candidatesFound: number;
      candidatesFiltered: number;
      candidatesEnriched: number;
      clustersCreated: number;
      winnerScore: number | null;
      isLowConfidence: boolean;
      durationMs: number;
    };
  } | null>(null);

  const { data: recentRuns, isLoading: runsLoading } = trpc.dailyPick.listRuns.useQuery({ limit: 5 });
  const { data: todayPick } = trpc.dailyPick.getToday.useQuery();

  const runJob = trpc.dailyPick.runJob.useMutation({
    onMutate: () => {
      setIsRunning(true);
      setLastResult(null);
    },
    onSuccess: (result) => {
      setIsRunning(false);
      setLastResult(result);
      utils.dailyPick.listRuns.invalidate();
      utils.dailyPick.getToday.invalidate();
    },
    onError: (error) => {
      setIsRunning(false);
      setLastResult({
        status: 'FAILED',
        runId: '',
        winnerClusterId: null,
        error: error.message,
      });
    },
  });

  const handleRunJob = () => {
    if (confirm('Run the Daily Trend Pick job? This may take several minutes.')) {
      runJob.mutate({});
    }
  };

  return (
    <div className="space-y-6">
      {/* Run Control */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
        <div>
          <h3 className="font-medium text-foreground">Manual Trigger</h3>
          <p className="text-sm text-muted-foreground">
            Run the Daily Trend Pick pipeline manually
          </p>
        </div>
        <Button
          onClick={handleRunJob}
          disabled={isRunning}
          isLoading={isRunning}
          variant="primary"
        >
          {isRunning ? (
            <>Running...</>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Job
            </>
          )}
        </Button>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div
          className={`p-4 rounded-xl border ${
            lastResult.status === 'SUCCESS'
              ? 'border-primary/50 bg-primary/10'
              : lastResult.status === 'PARTIAL'
              ? 'border-yellow-500/50 bg-yellow-500/10'
              : 'border-red-500/50 bg-red-500/10'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {lastResult.status === 'SUCCESS' ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : lastResult.status === 'PARTIAL' ? (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">
              Job {lastResult.status.toLowerCase()}
            </span>
          </div>
          {lastResult.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Candidates:</span>{' '}
                {lastResult.metrics.candidatesFound}
              </div>
              <div>
                <span className="text-muted-foreground">Filtered:</span>{' '}
                {lastResult.metrics.candidatesFiltered}
              </div>
              <div>
                <span className="text-muted-foreground">Clusters:</span>{' '}
                {lastResult.metrics.clustersCreated}
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>{' '}
                {(lastResult.metrics.durationMs / 1000).toFixed(1)}s
              </div>
            </div>
          )}
          {lastResult.error && (
            <p className="text-sm text-red-500 mt-2">{lastResult.error}</p>
          )}
        </div>
      )}

      {/* Today's Pick */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Today&apos;s Pick
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayPick ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {todayPick.cluster.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {todayPick.cluster.canonicalQuery}
                  </p>
                </div>
                <a
                  href="/daily-pick"
                  className="flex items-center gap-1 text-primary hover:underline text-sm"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-4 text-sm">
                <Badge variant="info">
                  Score: {todayPick.cluster.combinedScore.toFixed(1)}
                </Badge>
                <Badge variant="success">
                  Growth: {todayPick.cluster.growthScore}
                </Badge>
                <Badge variant="default">
                  Purchase: {todayPick.cluster.purchaseProofScore}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No pick for today yet. Run the job to generate one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runsLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : recentRuns && recentRuns.length > 0 ? (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {run.status === 'SUCCESS' ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : run.status === 'PARTIAL' ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <span className="text-sm font-medium">{run.dateLocal}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {run._count.candidates} candidates, {run._count.clusters} clusters
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(run.startedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No runs yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Token Usage Analytics Component
function TokenUsageAnalytics() {
  const [days, setDays] = useState<1 | 7 | 30>(1);

  const { data: summary, isLoading: summaryLoading } = trpc.admin.tokenUsageSummary.useQuery({ days });

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        <Button
          variant={days === 1 ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setDays(1)}
        >
          Today
        </Button>
        <Button
          variant={days === 7 ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setDays(7)}
        >
          Last 7 days
        </Button>
        <Button
          variant={days === 30 ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setDays(30)}
        >
          Last 30 days
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Total Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {(summary?.totals.totalTokens ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Est. Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              ${(summary?.totals.costEstimate ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              API Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {(summary?.totals.callCount ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Tokens/Call</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {summary?.totals.callCount
                ? Math.round(summary.totals.totalTokens / summary.totals.callCount).toLocaleString()
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Model breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage by Model</CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.byModel && summary.byModel.length > 0 ? (
            <div className="space-y-3">
              {summary.byModel.map((m) => (
                <div
                  key={m.model}
                  className="flex justify-between items-center py-2 border-b border-border last:border-0"
                >
                  <span className="font-mono text-sm">{m.model}</span>
                  <div className="text-right space-x-4">
                    <span className="text-muted-foreground">
                      {m.totalTokens.toLocaleString()} tokens
                    </span>
                    <span className="font-medium">${(m.costEstimate ?? 0).toFixed(2)}</span>
                    <Badge variant="info">{m.callCount} calls</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No usage data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* By Function breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage by Function</CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.byFunction && summary.byFunction.length > 0 ? (
            <div className="space-y-3">
              {summary.byFunction.map((f) => (
                <div
                  key={f.functionName}
                  className="flex justify-between items-center py-2 border-b border-border last:border-0"
                >
                  <span className="font-mono text-sm">{f.functionName}</span>
                  <div className="text-right space-x-4">
                    <Badge variant="info">{f.callCount} calls</Badge>
                    <span className="text-muted-foreground">
                      {f.totalTokens.toLocaleString()} tokens
                    </span>
                    <span className="font-medium">${(f.costEstimate ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No usage data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ai: <Cpu className="h-4 w-4" />,
  interview: <MessageSquare className="h-4 w-4" />,
  research: <Search className="h-4 w-4" />,
  limits: <Users className="h-4 w-4" />,
  features: <ToggleLeft className="h-4 w-4" />,
  domains: <Globe className="h-4 w-4" />,
  analytics: <BarChart3 className="h-4 w-4" />,
  dashboard: <LayoutGrid className="h-4 w-4" />,
  dailyPick: <TrendingUp className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI Models & Parameters',
  interview: 'Interview Settings',
  research: 'Research Settings',
  limits: 'Tier Limits',
  features: 'Feature Flags',
  domains: 'Search Domains',
  analytics: 'Analytics & Tracking',
  dashboard: 'Dashboard Panes',
  dailyPick: 'Daily Trend Pick',
};

function AdminPageContent() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('tab') || 'ai';
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showAuditLog, setShowAuditLog] = useState(false);

  const utils = trpc.useUtils();

  const { data: configs, isLoading } = trpc.admin.list.useQuery();
  const { data: auditLog } = trpc.admin.auditLog.useQuery({ limit: 20 }, { enabled: showAuditLog });

  const setConfig = trpc.admin.set.useMutation({
    onSuccess: () => {
      utils.admin.list.invalidate();
      utils.admin.auditLog.invalidate();
      setEditingKey(null);
    },
  });

  const toggleFeature = trpc.admin.toggleFeature.useMutation({
    onSuccess: () => {
      utils.admin.list.invalidate();
      utils.admin.auditLog.invalidate();
    },
  });

  const refreshCache = trpc.admin.refreshCache.useMutation({
    onSuccess: () => {
      alert('Server cache refreshed!');
    },
  });

  const seedDefaults = trpc.admin.seedDefaults.useMutation({
    onSuccess: (data) => {
      utils.admin.list.invalidate();
      alert(`Seeded ${data.seeded} default configs`);
    },
  });

  const resetCategory = trpc.admin.resetCategory.useMutation({
    onSuccess: (data) => {
      utils.admin.list.invalidate();
      utils.admin.auditLog.invalidate();
      alert(`Reset ${data.reset} configs to defaults`);
    },
  });

  if (isLoading) {
    return <LoadingScreen message="Loading admin configuration..." />;
  }

  const currentConfigs = (configs?.[activeCategory] || []) as ConfigItem[];

  const handleSave = (key: string, type: string) => {
    let parsedValue: ConfigValue = editValue;

    if (type === 'NUMBER') {
      parsedValue = parseFloat(editValue);
    } else if (type === 'BOOLEAN') {
      parsedValue = editValue === 'true';
    } else if (type === 'JSON') {
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        alert('Invalid JSON');
        return;
      }
    }

    setConfig.mutate({ key, value: parsedValue });
  };

  const startEditing = (key: string, value: ConfigValue) => {
    setEditingKey(key);
    if (typeof value === 'object') {
      setEditValue(JSON.stringify(value, null, 2));
    } else {
      setEditValue(String(value));
    }
  };

  const renderConfigValue = (item: ConfigItem) => {
    const isEditing = editingKey === item.key;

    // Boolean toggle
    if (item.type === 'BOOLEAN') {
      const boolValue = item.value === true || item.value === 'true';
      return (
        <button
          onClick={() => setConfig.mutate({ key: item.key, value: !boolValue })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            boolValue ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              boolValue ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      );
    }

    // Select dropdown
    if (item.type === 'SELECT' && item.options) {
      return (
        <select
          value={String(item.value)}
          onChange={(e) => setConfig.mutate({ key: item.key, value: e.target.value })}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          {item.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    // JSON editor
    if (item.type === 'JSON') {
      if (isEditing) {
        return (
          <div className="space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleSave(item.key, item.type)}>
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {Array.isArray(item.value) ? `[${(item.value as string[]).length} items]` : 'object'}
          </code>
          <Button size="sm" variant="ghost" onClick={() => startEditing(item.key, item.value)}>
            Edit
          </Button>
        </div>
      );
    }

    // Number/String input
    if (isEditing) {
      return (
        <div className="flex gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            type={item.type === 'NUMBER' ? 'number' : 'text'}
            className="w-32"
          />
          <Button size="sm" onClick={() => handleSave(item.key, item.type)}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <button
        onClick={() => startEditing(item.key, item.value)}
        className="text-sm font-mono bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors"
      >
        {String(item.value)}
      </button>
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-3">
            {CATEGORY_ICONS[activeCategory]}
            {CATEGORY_LABELS[activeCategory] || activeCategory}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCategory === 'ai' && 'Configure AI models and parameters'}
            {activeCategory === 'interview' && 'Interview session settings'}
            {activeCategory === 'research' && 'Research pipeline configuration'}
            {activeCategory === 'limits' && 'Subscription tier limits'}
            {activeCategory === 'features' && 'Toggle feature flags'}
            {activeCategory === 'domains' && 'Configure search domains'}
            {activeCategory === 'analytics' && 'View token usage analytics'}
            {activeCategory === 'dashboard' && 'Configure dashboard pane settings'}
            {activeCategory === 'dailyPick' && 'Daily trend pick pipeline control'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => seedDefaults.mutate()}
            isLoading={seedDefaults.isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            Seed Defaults
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshCache.mutate()}
            isLoading={refreshCache.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh Cache
          </Button>
        </div>
      </div>

      {/* Quick Toggles - only show on AI or Features tab */}
      {(activeCategory === 'ai' || activeCategory === 'features') && (
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'testMode', label: 'Test Mode' },
            { key: 'mockAI', label: 'Mock AI' },
            { key: 'deepResearch.enabled', label: 'Deep Research' },
            { key: 'socialProof', label: 'Social Proof' },
            { key: 'serpApi', label: 'SerpAPI' },
          ].map((toggle) => {
            const configKey = toggle.key === 'deepResearch.enabled'
              ? 'ai.deepResearch.enabled'
              : `features.${toggle.key}`;
            const isEnabled = (configs?.ai as ConfigItem[] | undefined)?.find((c) => c.key === configKey)?.value === true
              || (configs?.features as ConfigItem[] | undefined)?.find((c) => c.key === configKey)?.value === true;

            return (
              <button
                key={toggle.key}
                onClick={() => toggleFeature.mutate({ feature: toggle.key as 'testMode' | 'mockAI' | 'socialProof' | 'serpApi' | 'deepResearch.enabled' })}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                  isEnabled
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                {toggle.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Reset button for config categories */}
        {!['analytics', 'dailyPick'].includes(activeCategory) && currentConfigs.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetCategory.mutate({ category: activeCategory })}
              isLoading={resetCategory.isPending}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset to Defaults
            </Button>
          </div>
        )}

        {/* Special rendering for Analytics category - Token Usage */}
        {activeCategory === 'analytics' ? (
          <TokenUsageAnalytics />
        ) : activeCategory === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groupDashboardPaneConfigs(currentConfigs).map(([paneName, paneConfig]) => (
              <DashboardPaneCard
                key={paneName}
                paneName={paneName}
                config={paneConfig}
                onSave={(key, value) => setConfig.mutate({ key, value })}
                isSaving={setConfig.isPending}
              />
            ))}
          </div>
        ) : activeCategory === 'dailyPick' ? (
          <DailyPickControl />
        ) : (
          <div className="space-y-3">
            {currentConfigs.map((item: ConfigItem) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                  <code className="text-[10px] text-muted-foreground/70 font-mono mt-1 block">{item.key}</code>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {renderConfigValue(item)}
                </div>
              </div>
            ))}
            {currentConfigs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No configuration items in this category.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audit Log */}
      <div className="mt-8 pt-6 border-t border-border">
        <button
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAuditLog ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <History className="h-4 w-4" />
          <span className="text-sm font-medium">Recent Changes</span>
        </button>

        {showAuditLog && (
          <div className="mt-4 space-y-2">
            {auditLog && auditLog.length > 0 ? (
              auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-xs py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{entry.configKey}</code>
                    <span className="text-muted-foreground">&rarr;</span>
                    <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {typeof entry.newValue === 'object'
                        ? JSON.stringify(entry.newValue).substring(0, 30) + '...'
                        : String(entry.newValue)}
                    </code>
                  </div>
                  <div className="text-muted-foreground/70 ml-4 flex-shrink-0">
                    {new Date(entry.changedAt).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm py-4">No changes recorded yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading admin..." />}>
      <AdminPageContent />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
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

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ai: <Cpu className="h-4 w-4" />,
  interview: <MessageSquare className="h-4 w-4" />,
  research: <Search className="h-4 w-4" />,
  limits: <Users className="h-4 w-4" />,
  features: <ToggleLeft className="h-4 w-4" />,
  domains: <Globe className="h-4 w-4" />,
  analytics: <BarChart3 className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI Models & Parameters',
  interview: 'Interview Settings',
  research: 'Research Settings',
  limits: 'Tier Limits',
  features: 'Feature Flags',
  domains: 'Search Domains',
  analytics: 'Analytics & Tracking',
};

export default function AdminPage() {
  const [activeCategory, setActiveCategory] = useState<string>('ai');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showAuditLog, setShowAuditLog] = useState(false);

  const utils = trpc.useUtils();

  const { data: configs, isLoading } = trpc.admin.list.useQuery();
  const { data: categories } = trpc.admin.categories.useQuery();
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

  const currentConfigs = configs?.[activeCategory] || [];

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
    <div className="w-full max-w-[1120px] mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Admin Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">Runtime configuration and feature flags</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedDefaults.mutate()}
            isLoading={seedDefaults.isPending}
          >
            Seed Defaults
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshCache.mutate()}
            isLoading={refreshCache.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Cache
          </Button>
        </div>
      </div>

      {/* Quick Toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Toggles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'testMode', label: 'Test Mode', color: 'warning' },
              { key: 'mockAI', label: 'Mock AI', color: 'info' },
              { key: 'deepResearch.enabled', label: 'Deep Research', color: 'success' },
              { key: 'socialProof', label: 'Social Proof', color: 'default' },
              { key: 'serpApi', label: 'SerpAPI', color: 'default' },
            ].map((toggle) => {
              const configKey = toggle.key === 'deepResearch.enabled'
                ? 'ai.deepResearch.enabled'
                : `features.${toggle.key}`;
              const isEnabled = configs?.ai?.find((c: ConfigItem) => c.key === configKey)?.value === true
                || configs?.features?.find((c: ConfigItem) => c.key === configKey)?.value === true;

              return (
                <button
                  key={toggle.key}
                  onClick={() => toggleFeature.mutate({ feature: toggle.key as 'testMode' | 'mockAI' | 'socialProof' | 'serpApi' | 'deepResearch.enabled' })}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
                    isEnabled
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {isEnabled ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  {toggle.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {CATEGORY_ICONS[cat.id]}
            {CATEGORY_LABELS[cat.id] || cat.label}
            <Badge variant="secondary" className="ml-1">
              {cat.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Config Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {CATEGORY_ICONS[activeCategory]}
              {CATEGORY_LABELS[activeCategory]}
            </CardTitle>
            <CardDescription>
              Configure {activeCategory} settings
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetCategory.mutate({ category: activeCategory })}
            isLoading={resetCategory.isPending}
          >
            Reset to Defaults
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentConfigs.map((item: ConfigItem) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <code className="text-xs text-muted-foreground">{item.key}</code>
                </div>
                <div className="ml-4">
                  {renderConfigValue(item)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setShowAuditLog(!showAuditLog)}
            className="flex items-center gap-2 w-full text-left"
          >
            {showAuditLog ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <History className="h-4 w-4" />
            <CardTitle className="text-lg">Recent Changes</CardTitle>
          </button>
        </CardHeader>
        {showAuditLog && (
          <CardContent>
            {auditLog && auditLog.length > 0 ? (
              <div className="space-y-2">
                {auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-sm border-b border-border pb-2"
                  >
                    <div>
                      <code className="text-xs bg-muted px-1 rounded">{entry.configKey}</code>
                      <span className="text-muted-foreground mx-2">changed to</span>
                      <code className="text-xs bg-primary/10 text-primary px-1 rounded">
                        {typeof entry.newValue === 'object'
                          ? JSON.stringify(entry.newValue).substring(0, 30) + '...'
                          : String(entry.newValue)}
                      </code>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {new Date(entry.changedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No changes recorded yet.</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

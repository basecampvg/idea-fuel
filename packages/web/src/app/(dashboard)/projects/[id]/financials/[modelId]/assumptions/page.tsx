'use client';

import { use, useState, useCallback, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { ModuleInputGroup } from './components/module-input-group';
import { DerivedMetricsStrip } from './components/derived-metrics-strip';
import { DependencyGraph } from './components/dependency-graph';
import { ASSUMPTION_IMPACT_MAP } from './components/impact-map';
import { Settings2, Loader2, GitBranch } from 'lucide-react';
import type { AssumptionCategory, AssumptionConfidence } from '@forge/shared';

const MODULE_ICONS: Record<string, string> = {
  marketing_funnel: '📣',
  ltv_cohort: '📊',
  payroll: '👥',
  cogs_variable: '📦',
  debt_schedule: '🏦',
};

/** Map module keys to which category they display under */
const MODULE_CATEGORY_MAP: Record<string, string> = {
  marketing_funnel: 'ACQUISITION',
  ltv_cohort: 'REVENUE',
  payroll: 'COSTS',
  cogs_variable: 'COSTS',
  debt_schedule: 'FINANCING',
};

/** Assumptions with a formula and no children are "derived" (computed) */
function isDerived(a: { formula: string | null; parentId?: string | null }, childCount: number): boolean {
  return !!a.formula && childCount === 0 && !a.parentId;
}

const CATEGORY_ORDER = ['GENERAL', 'PRICING', 'ACQUISITION', 'REVENUE', 'RETENTION', 'MARKET', 'COSTS', 'FINANCING', 'FUNDING', 'TIMELINE'];

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General / Model Settings',
  PRICING: 'Pricing',
  ACQUISITION: 'Acquisition',
  REVENUE: 'Revenue',
  RETENTION: 'Retention',
  MARKET: 'Market',
  COSTS: 'Costs',
  FINANCING: 'Financing',
  FUNDING: 'Funding',
  TIMELINE: 'Timeline',
};

export default function FinancialAssumptionsPage({
  params,
}: {
  params: Promise<{ id: string; modelId: string }>;
}) {
  const { id: projectId, modelId } = use(params);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  const utils = trpc.useUtils();

  // Seed defaults on first visit
  const seedMutation = trpc.assumption.seedDefaults.useMutation({
    onSuccess: () => utils.assumption.list.invalidate({ projectId }),
  });
  const syncMutation = trpc.assumption.syncFromTemplate.useMutation({
    onSuccess: (data: { synced: boolean; added: number; updated: number }) => {
      if (data.synced && (data.added > 0 || data.updated > 0)) {
        utils.assumption.list.invalidate({ projectId });
      }
    },
  });

  // Fetch assumptions
  const { data: assumptions, isLoading, error } = trpc.assumption.list.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  // Fetch active modules for this model
  const { data: modelModules } = trpc.financial.listModelModules.useQuery(
    { modelId },
    { enabled: !!modelId },
  );

  // Auto-seed / auto-sync
  useEffect(() => {
    if (assumptions && assumptions.length === 0 && !seedMutation.isPending && !seedMutation.isSuccess) {
      seedMutation.mutate({ projectId });
    }
  }, [assumptions, projectId, seedMutation]);

  useEffect(() => {
    if (assumptions && assumptions.length > 0 && !syncMutation.isPending && !syncMutation.isSuccess) {
      syncMutation.mutate({ projectId, modelId });
    }
  }, [assumptions, projectId, modelId, syncMutation]);

  // Mutations
  const updateMutation = trpc.assumption.update.useMutation({
    onSuccess: () => utils.assumption.list.invalidate({ projectId }),
  });
  const createSubMutation = trpc.assumption.createSubAssumption.useMutation({
    onSuccess: () => utils.assumption.list.invalidate({ projectId }),
  });
  const deleteSubMutation = trpc.assumption.deleteSubAssumption.useMutation({
    onSuccess: () => utils.assumption.list.invalidate({ projectId }),
  });

  // Handlers
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  }, []);

  const handleValueChange = useCallback((id: string, value: string) => {
    updateMutation.mutate({ id, projectId, value });
  }, [projectId, updateMutation]);

  const handleAddSub = useCallback((parentId: string, data: { name: string; key: string; value: string }) => {
    createSubMutation.mutate({
      projectId,
      parentId,
      name: data.name,
      key: data.key,
      value: data.value,
      valueType: 'NUMBER',
    });
  }, [projectId, createSubMutation]);

  const handleDeleteSub = useCallback((id: string) => {
    deleteSubMutation.mutate({ projectId, assumptionId: id });
  }, [projectId, deleteSubMutation]);

  const handleSubValueChange = useCallback((id: string, value: string) => {
    updateMutation.mutate({ id, projectId, value });
  }, [projectId, updateMutation]);

  // Build children count map for detecting derived assumptions
  const childrenCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!assumptions) return map;
    for (const a of assumptions) {
      if ((a as { parentId?: string | null }).parentId) {
        const pid = (a as { parentId: string }).parentId;
        map.set(pid, (map.get(pid) ?? 0) + 1);
      }
    }
    return map;
  }, [assumptions]);

  // Separate assumptions into: general inputs, module inputs (by module), derived metrics
  const { generalInputs, moduleGroups, derivedMetrics, categoryModuleMap } = useMemo(() => {
    if (!assumptions) return { generalInputs: [], moduleGroups: new Map(), derivedMetrics: [], categoryModuleMap: new Map() };

    const allAssumptions = assumptions as Array<{
      id: string; name: string; key: string; value: string | null; unit: string | null;
      formula: string | null; category: string; confidence: string;
      parentId?: string | null; aggregationMode?: string | null;
    }>;

    const enabledModuleKeys = new Set(
      (modelModules ?? []).filter((m: { isEnabled: boolean }) => m.isEnabled).map((m: { moduleKey: string }) => m.moduleKey),
    );

    const general: typeof allAssumptions = [];
    const derived: Array<{ label: string; value: string | number | null; unit?: string }> = [];
    const modGroups = new Map<string, typeof allAssumptions>();
    const catModMap = new Map<string, string[]>();

    // Known module input keys (from module definitions)
    const moduleInputKeys: Record<string, string[]> = {
      marketing_funnel: ['impressions', 'impression_growth_rate', 'ctr', 'cpc', 'conv_rate'],
      ltv_cohort: ['arpu', 'monthly_retention_rate', 'new_customers_per_period'],
      payroll: ['headcount', 'avg_salary', 'wrap_rate', 'annual_raise_pct'],
      cogs_variable: ['hosting_cost_per_user', 'api_cost_per_user', 'support_cost_per_user', 'payment_processing_pct'],
      debt_schedule: ['initial_debt', 'annual_interest_rate', 'loan_term_months'],
    };

    // Build a set of all module input keys for enabled modules
    const allModuleInputKeySet = new Set<string>();
    for (const [modKey, keys] of Object.entries(moduleInputKeys)) {
      if (enabledModuleKeys.has(modKey)) {
        for (const k of keys) allModuleInputKeySet.add(k);
      }
    }

    for (const a of allAssumptions) {
      if (a.parentId) continue; // Children are handled via childrenMap

      const childCount = childrenCountMap.get(a.id) ?? 0;

      // Check if this is a module input
      let assignedToModule = false;
      for (const [modKey, keys] of Object.entries(moduleInputKeys)) {
        if (enabledModuleKeys.has(modKey) && keys.includes(a.key)) {
          const list = modGroups.get(modKey) ?? [];
          list.push(a);
          modGroups.set(modKey, list);
          assignedToModule = true;

          // Track category → module mapping
          const cat = MODULE_CATEGORY_MAP[modKey] ?? a.category;
          const catMods = catModMap.get(cat) ?? [];
          if (!catMods.includes(modKey)) catMods.push(modKey);
          catModMap.set(cat, catMods);
          break;
        }
      }

      if (assignedToModule) continue;

      // Check if derived (has formula, no children, not a module input)
      if (isDerived(a, childCount)) {
        const unitMap: Record<string, string> = { CURRENCY: '$', PERCENTAGE: '%', NUMBER: '' };
        derived.push({
          label: a.name,
          value: a.value,
          unit: a.unit ?? unitMap[(a as { valueType?: string }).valueType ?? ''] ?? undefined,
        });
        continue;
      }

      // General input
      general.push(a);
    }

    // Also include children for each assumption
    for (const a of allAssumptions) {
      if (!a.parentId) continue;
      // Add children to whichever group their parent is in
      for (const [modKey, list] of modGroups) {
        if (list.some((p) => p.id === a.parentId)) {
          list.push(a);
          break;
        }
      }
      // Check if parent is in general
      if (general.some((p) => p.id === a.parentId)) {
        general.push(a);
      }
    }

    return {
      generalInputs: general,
      moduleGroups: modGroups,
      derivedMetrics: derived,
      categoryModuleMap: catModMap,
    };
  }, [assumptions, modelModules, childrenCountMap]);

  // Build category → content structure
  const categoryContent = useMemo(() => {
    const sections: Array<{
      category: string;
      modules: Array<{ moduleKey: string; title: string; icon?: string; assumptions: typeof generalInputs }>;
    }> = [];

    // General section first
    if (generalInputs.length > 0) {
      sections.push({
        category: 'GENERAL',
        modules: [{ moduleKey: 'general', title: 'General / Model Settings', icon: '⚙️', assumptions: generalInputs }],
      });
    }

    // Module sections by category
    for (const cat of CATEGORY_ORDER) {
      const moduleKeys = categoryModuleMap.get(cat);
      if (!moduleKeys) continue;

      const mods = moduleKeys
        .map((modKey: string) => {
          const modAssumptions = moduleGroups.get(modKey);
          if (!modAssumptions || modAssumptions.length === 0) return null;
          const modInfo = (modelModules ?? []).find((m: { moduleKey: string }) => m.moduleKey === modKey);
          return {
            moduleKey: modKey,
            title: (modInfo as { module?: { name?: string } } | undefined)?.module?.name ?? modKey,
            icon: MODULE_ICONS[modKey],
            assumptions: modAssumptions,
          };
        })
        .filter(Boolean) as Array<{ moduleKey: string; title: string; icon?: string; assumptions: typeof generalInputs }>;

      if (mods.length > 0) {
        sections.push({ category: cat, modules: mods });
      }
    }

    return sections;
  }, [generalInputs, moduleGroups, categoryModuleMap, modelModules]);

  // Loading
  if (isLoading || seedMutation.isPending || syncMutation.isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {seedMutation.isPending ? 'Setting up assumptions...'
              : syncMutation.isPending ? 'Syncing calculated fields...'
              : 'Loading assumptions...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Model Inputs</h2>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {assumptions?.filter((a: { id: string; parentId?: string | null; formula: string | null }) => !a.parentId && !isDerived(a, childrenCountMap.get(a.id) ?? 0)).length ?? 0} inputs
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowGraph((prev) => !prev)}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
            transition-colors border
            ${showGraph
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }
          `}
        >
          <GitBranch className="w-3.5 h-3.5" />
          Dep Graph
        </button>
      </div>

      {/* Dependency graph */}
      {showGraph && assumptions && (
        <DependencyGraph
          assumptions={(assumptions ?? []).map((a: { key: string; name: string; category: string; confidence: string; effectiveConfidence?: string; dependsOn: string[]; value: string | null }) => ({
            key: a.key,
            name: a.name,
            category: a.category as AssumptionCategory,
            confidence: (a.effectiveConfidence ?? a.confidence) as AssumptionConfidence,
            dependsOn: a.dependsOn as string[],
            value: a.value,
          }))}
          impactMap={ASSUMPTION_IMPACT_MAP}
          onClose={() => setShowGraph(false)}
        />
      )}

      {/* Category sections with module groups */}
      {categoryContent.map(({ category, modules }) => (
        <div key={category} className="space-y-3">
          <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          {modules.map((mod) => (
            <ModuleInputGroup
              key={mod.moduleKey}
              title={mod.title}
              icon={mod.icon}
              assumptions={mod.assumptions}
              expandedCardId={expandedCardId}
              onToggleExpand={handleToggleExpand}
              onValueChange={handleValueChange}
              onAddSub={handleAddSub}
              onDeleteSub={handleDeleteSub}
              onSubValueChange={handleSubValueChange}
            />
          ))}
        </div>
      ))}

      {/* Derived metrics strip */}
      {derivedMetrics.length > 0 && (
        <DerivedMetricsStrip metrics={derivedMetrics} />
      )}
    </div>
  );
}

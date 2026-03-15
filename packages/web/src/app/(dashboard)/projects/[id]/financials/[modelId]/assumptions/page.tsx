'use client';

import { use, useState, useCallback, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { ModuleInputGroup } from './components/module-input-group';
import { DerivedMetricsStrip } from './components/derived-metrics-strip';
import { ImpactChart } from './components/impact-chart';
import { DependencyGraph } from './components/dependency-graph';
import { ASSUMPTION_IMPACT_MAP } from './components/impact-map';
import { Settings2, Loader2, GitBranch, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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

  // Fetch model (for scenarios) and active modules
  const { data: model } = trpc.financial.get.useQuery(
    { id: modelId },
    { enabled: !!modelId },
  );
  const { data: modelModules } = trpc.financial.listModelModules.useQuery(
    { modelId },
    { enabled: !!modelId },
  );

  // Get base scenario ID for computeStatements
  const baseScenarioId = useMemo(() => {
    if (!model?.scenarios) return null;
    const base = model.scenarios.find((s: { isBase: boolean }) => s.isBase);
    return base?.id ?? model.scenarios[0]?.id ?? null;
  }, [model]);

  // Fetch computed statements for derived metrics and module outputs
  const { data: computedStatements } = trpc.financial.computeStatements.useQuery(
    { scenarioId: baseScenarioId! },
    { enabled: !!baseScenarioId },
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

  // Auto-sync modules for existing models (enables defaults if none configured)
  const syncModulesMutation = trpc.financial.syncModules.useMutation({
    onSuccess: (data: { synced: boolean; count: number }) => {
      if (data.synced) {
        utils.financial.listModelModules.invalidate({ modelId });
        utils.assumption.list.invalidate({ projectId });
      }
    },
  });
  useEffect(() => {
    if (modelModules && modelModules.length === 0 && !syncModulesMutation.isPending && !syncModulesMutation.isSuccess) {
      syncModulesMutation.mutate({ modelId });
    }
  }, [modelModules, modelId, syncModulesMutation]);

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

  const handleFormulaChange = useCallback((id: string, formula: string | null) => {
    updateMutation.mutate({ id, projectId, formula });
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

  // Build flat list of all assumptions for formula autocomplete
  const allAssumptionsForAutocomplete = useMemo(() => {
    if (!assumptions) return [];
    return (assumptions as Array<{ key: string; name: string; value: string | null; unit: string | null }>)
      .map((a) => ({ key: a.key, name: a.name, value: a.value, unit: a.unit }));
  }, [assumptions]);

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

    // Known module input keys (from module definitions + template overlaps)
    // These map assumption keys to the module they belong to.
    // Template assumptions like headcount/avg_salary overlap with Payroll module inputs.
    const moduleInputKeys: Record<string, string[]> = {
      marketing_funnel: ['impressions', 'impression_growth_rate', 'ctr', 'cpc', 'conv_rate', 'marketing_budget'],
      ltv_cohort: ['arpu', 'monthly_retention_rate', 'new_customers_per_period', 'monthly_churn', 'starting_customers', 'monthly_new_customers'],
      payroll: ['headcount', 'avg_salary', 'wrap_rate', 'annual_raise_pct', 'salary_growth_rate', 'new_hires_per_year', 'benefits_pct', 'non_billable_staff', 'admin_salary'],
      cogs_variable: ['hosting_cost_per_user', 'api_cost_per_user', 'support_cost_per_user', 'payment_processing_pct', 'hosting_cost_pct', 'support_cost_pct', 'cogs_pct', 'gross_margin'],
      debt_schedule: ['initial_debt', 'annual_interest_rate', 'loan_term_months', 'funding_amount', 'funding_month'],
    };

    // Build a set of ALL module input keys (including disabled modules)
    // so we can exclude them from General even when the module is off
    const allModuleInputKeySet = new Set<string>();
    for (const keys of Object.values(moduleInputKeys)) {
      for (const k of keys) allModuleInputKeySet.add(k);
    }

    // Track assigned assumption IDs to prevent duplicates
    const assignedIds = new Set<string>();

    for (const a of allAssumptions) {
      if (a.parentId) continue; // Children are handled via childrenMap

      const childCount = childrenCountMap.get(a.id) ?? 0;

      // Check if this is a module input for an ENABLED module
      let assignedToModule = false;
      for (const [modKey, keys] of Object.entries(moduleInputKeys)) {
        if (enabledModuleKeys.has(modKey) && keys.includes(a.key)) {
          const list = modGroups.get(modKey) ?? [];
          list.push(a);
          modGroups.set(modKey, list);
          assignedToModule = true;
          assignedIds.add(a.id);

          // Track category → module mapping
          const cat = MODULE_CATEGORY_MAP[modKey] ?? a.category;
          const catMods = catModMap.get(cat) ?? [];
          if (!catMods.includes(modKey)) catMods.push(modKey);
          catModMap.set(cat, catMods);
          break;
        }
      }

      if (assignedToModule) continue;

      // Skip assumptions claimed by any module (even disabled ones) — they don't belong in General
      if (allModuleInputKeySet.has(a.key)) continue;

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

      // General input (not claimed by any module)
      general.push(a);
      assignedIds.add(a.id);
    }

    // Include children in their parent's group
    for (const a of allAssumptions) {
      if (!a.parentId) continue;
      if (assignedIds.has(a.id)) continue; // prevent duplicates

      // Add to the module group that contains the parent
      for (const [, list] of modGroups) {
        if (list.some((p) => p.id === a.parentId)) {
          list.push(a);
          assignedIds.add(a.id);
          break;
        }
      }
      // Or to general if parent is there
      if (!assignedIds.has(a.id) && general.some((p) => p.id === a.parentId)) {
        general.push(a);
        assignedIds.add(a.id);
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
      modules: Array<{ moduleKey: string; title: string; icon?: string; outputSummary?: string; assumptions: typeof generalInputs }>;
    }> = [];

    // General section first
    if (generalInputs.length > 0) {
      sections.push({
        category: 'GENERAL',
        modules: [{ moduleKey: 'general', title: 'General / Model Settings', icon: '⚙️', assumptions: generalInputs, outputSummary: undefined as string | undefined }],
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

          // Build output summary from computed statements
          let outputSummary: string | undefined;
          if (computedStatements) {
            const summaryMap: Record<string, () => string | undefined> = {
              marketing_funnel: () => {
                const mktLine = computedStatements.pl.lines.find((l: { key: string }) => l.key === 'marketing');
                return mktLine ? `$${Math.round(mktLine.values[0]).toLocaleString()}/mo ad spend` : undefined;
              },
              ltv_cohort: () => {
                const revLine = computedStatements.pl.lines.find((l: { key: string }) => l.key === 'subscription_revenue' || l.key === 'revenue');
                return revLine ? `$${Math.round(revLine.values[0]).toLocaleString()}/mo revenue` : undefined;
              },
              payroll: () => {
                const salLine = computedStatements.pl.lines.find((l: { key: string }) => l.key === 'salaries');
                return salLine ? `$${Math.round(salLine.values[0]).toLocaleString()}/mo payroll` : undefined;
              },
              cogs_variable: () => {
                const cogsLine = computedStatements.pl.lines.find((l: { key: string }) => l.key === 'cogs');
                return cogsLine ? `$${Math.round(cogsLine.values[0]).toLocaleString()}/mo COGS` : undefined;
              },
              debt_schedule: () => {
                const intLine = computedStatements.pl.lines.find((l: { key: string }) => l.key === 'interest');
                return intLine && intLine.values[0] !== 0 ? `$${Math.round(intLine.values[0]).toLocaleString()}/mo interest` : 'No debt';
              },
            };
            outputSummary = summaryMap[modKey]?.();
          }

          return {
            moduleKey: modKey,
            title: (modInfo as { module?: { name?: string } } | undefined)?.module?.name ?? modKey,
            icon: MODULE_ICONS[modKey],
            assumptions: modAssumptions,
            outputSummary,
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
          assumptions={(assumptions ?? []).map((a: { key: string; name: string; category: string; confidence: string; effectiveConfidence?: string; dependsOn: string[] | null; value: string | null }) => ({
            key: a.key,
            name: a.name,
            category: a.category as AssumptionCategory,
            confidence: (a.effectiveConfidence ?? a.confidence) as AssumptionConfidence,
            dependsOn: (a.dependsOn ?? []) as string[],
            value: a.value,
          }))}
          impactMap={ASSUMPTION_IMPACT_MAP}
          onClose={() => setShowGraph(false)}
        />
      )}

      {/* Category sections with module groups */}
      {categoryContent.map(({ category, modules }) => {
        const isCatExpanded = expandedCategories.has(category);
        const totalInputs = modules.reduce((sum, m) => sum + m.assumptions.filter((a: { parentId?: string | null }) => !a.parentId).length, 0);
        return (
        <div key={category} className="space-y-2">
          <button
            type="button"
            onClick={() => setExpandedCategories(prev => {
              const next = new Set(prev);
              if (next.has(category)) next.delete(category); else next.add(category);
              return next;
            })}
            className="flex items-center gap-2 w-full text-left px-1 py-1 rounded hover:bg-muted/30 transition-colors"
          >
            {isCatExpanded
              ? <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
              : <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            }
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[category] ?? category}
            </span>
            <span className="text-[10px] text-muted-foreground/30">{totalInputs}</span>
          </button>
          {isCatExpanded && modules.map((mod) => (
            <ModuleInputGroup
              key={mod.moduleKey}
              title={mod.title}
              icon={mod.icon}
              outputSummary={mod.outputSummary}
              assumptions={mod.assumptions}
              allAssumptions={allAssumptionsForAutocomplete}
              expandedCardId={expandedCardId}
              onToggleExpand={handleToggleExpand}
              onValueChange={handleValueChange}
              onFormulaChange={handleFormulaChange}
              onAddSub={handleAddSub}
              onDeleteSub={handleDeleteSub}
              onSubValueChange={handleSubValueChange}
            />
          ))}
        </div>
        );
      })}

      {/* Derived metrics strip */}
      {/* Period-by-period impact chart */}
      <ImpactChart statements={computedStatements ?? null} />

      {/* Derived metrics from computed statements */}
      <DerivedMetricsStrip metrics={(() => {
        if (!computedStatements) return derivedMetrics; // fallback to assumption-based
        const pl = computedStatements.pl;
        const cf = computedStatements.cf;
        const getLast = (lines: typeof pl.lines, key: string) => {
          const line = lines.find((l: { key: string }) => l.key === key);
          return line?.values?.[0] ?? null; // period 1 value
        };
        const getSum = (lines: typeof pl.lines, key: string) => {
          const line = lines.find((l: { key: string }) => l.key === key);
          return line?.values?.reduce((s: number, v: number) => s + v, 0) ?? null;
        };
        const revM1 = getLast(pl.lines, 'revenue') ?? getLast(pl.lines, 'subscription_revenue');
        const netIncomeM1 = getLast(pl.lines, 'net_income');
        const endingCash = getLast(cf.lines, 'ending_cash');
        const y1NetIncome = computedStatements.pl.lines.find((l: { key: string }) => l.key === 'net_income')?.values?.slice(0, 12) ?? [];
        const avgBurn = y1NetIncome.length > 0 ? y1NetIncome.reduce((s: number, v: number) => s + v, 0) / y1NetIncome.length : 0;
        const startCash = (assumptions as Array<{ key: string; value: string | null }>)?.find(a => a.key === 'starting_cash');
        const startCashVal = startCash ? parseFloat(startCash.value ?? '0') : 0;
        const runway = avgBurn < 0 ? Math.floor(startCashVal / Math.abs(avgBurn)) : null;

        return [
          { label: 'Monthly Revenue', value: revM1, unit: '$' },
          { label: 'Net Income (M1)', value: netIncomeM1, unit: '$', trend: (netIncomeM1 ?? 0) >= 0 ? 'up' as const : 'down' as const },
          { label: 'Runway', value: runway, unit: 'months' },
          { label: 'Ending Cash', value: endingCash, unit: '$' },
          { label: 'Avg Monthly Burn (Y1)', value: avgBurn, unit: '$', trend: avgBurn >= 0 ? 'up' as const : 'down' as const },
          ...derivedMetrics.slice(0, 3), // Include a few assumption-level derived metrics too
        ];
      })()} />
    </div>
  );
}

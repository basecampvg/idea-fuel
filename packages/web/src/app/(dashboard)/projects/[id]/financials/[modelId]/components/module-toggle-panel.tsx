'use client';

import { trpc } from '@/lib/trpc/client';
import { Blocks, Loader2 } from 'lucide-react';

const MODULE_ICONS: Record<string, string> = {
  marketing_funnel: '📣',
  ltv_cohort: '📊',
  payroll: '👥',
  cogs_variable: '📦',
  debt_schedule: '🏦',
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  marketing_funnel: 'Impressions → clicks → conversions → customers + ad spend',
  ltv_cohort: 'Cohort-based revenue with retention curve',
  payroll: 'Headcount × salary × wrap rate with raises',
  cogs_variable: 'Per-user hosting, API, and support costs',
  debt_schedule: 'Loan amortization with interest and principal',
};

interface ModuleTogglePanelProps {
  modelId: string;
}

export function ModuleTogglePanel({ modelId }: ModuleTogglePanelProps) {
  const utils = trpc.useUtils();

  const { data: availableModules, isLoading: loadingAvailable } =
    trpc.financial.listAvailableModules.useQuery();

  const { data: modelModules, isLoading: loadingModel } =
    trpc.financial.listModelModules.useQuery({ modelId });

  const toggleMutation = trpc.financial.toggleModule.useMutation({
    onSuccess: () => {
      utils.financial.listModelModules.invalidate({ modelId });
    },
  });

  if (loadingAvailable || loadingModel) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Blocks className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Calculation Modules</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Build enabled set from model modules
  const enabledModules = new Set(
    (modelModules ?? [])
      .filter((m) => m.isEnabled)
      .map((m) => m.moduleKey),
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Blocks className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Calculation Modules</h3>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {enabledModules.size} of {availableModules?.length ?? 0} active
        </span>
      </div>

      <p className="text-xs text-muted-foreground/60 mb-4">
        Modules add detailed calculation sheets that feed into your financial statements.
      </p>

      <div className="space-y-2">
        {(availableModules ?? []).map((mod) => {
          const isEnabled = enabledModules.has(mod.key);
          const isToggling = toggleMutation.isPending && toggleMutation.variables?.moduleKey === mod.key;

          return (
            <div
              key={mod.key}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all
                ${isEnabled
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-border bg-card hover:bg-muted/30'
                }
              `}
            >
              <span className="text-base flex-shrink-0">
                {MODULE_ICONS[mod.key] ?? '📋'}
              </span>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground">
                  {mod.name}
                </div>
                <div className="text-[10px] text-muted-foreground/60 truncate">
                  {MODULE_DESCRIPTIONS[mod.key] ?? `${mod.inputCount} inputs, ${mod.outputCount} outputs`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleMutation.mutate({
                  modelId,
                  moduleKey: mod.key,
                  enabled: !isEnabled,
                })}
                disabled={isToggling}
                className={`
                  relative w-9 h-5 rounded-full transition-colors flex-shrink-0
                  ${isEnabled ? 'bg-primary' : 'bg-muted-foreground/20'}
                  ${isToggling ? 'opacity-50' : ''}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                    ${isEnabled ? 'translate-x-4' : 'translate-x-0.5'}
                  `}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

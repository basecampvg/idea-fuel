'use client';

import { use, useState, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/spinner';
import { AssumptionSection } from './components/assumption-section';
import { Settings2, Loader2 } from 'lucide-react';

// Category display order and labels
const CATEGORY_ORDER = [
  'PRICING',
  'ACQUISITION',
  'RETENTION',
  'MARKET',
  'COSTS',
  'FUNDING',
  'TIMELINE',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  PRICING: 'Revenue & Pricing',
  ACQUISITION: 'Customer Acquisition',
  RETENTION: 'Retention & Growth',
  MARKET: 'Market',
  COSTS: 'Costs & Expenses',
  FUNDING: 'Funding & Capital',
  TIMELINE: 'Timeline',
};

export default function FinancialAssumptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: modelId } = use(params);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  // First, get the model to find the base scenario
  const { data: model, isLoading: modelLoading } = trpc.financial.get.useQuery({ id: modelId });
  const baseScenarioId = model?.scenarios?.find((s) => s.isBase)?.id;

  // Fetch assumptions for the base scenario
  const {
    data: assumptions,
    isLoading: assumptionsLoading,
  } = trpc.assumption.listByScenario.useQuery(
    { scenarioId: baseScenarioId! },
    { enabled: !!baseScenarioId },
  );

  const updateMutation = trpc.assumption.updateByScenario.useMutation({
    onSuccess: (_data, variables) => {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.assumptionId);
        return next;
      });
      if (baseScenarioId) {
        utils.assumption.listByScenario.invalidate({ scenarioId: baseScenarioId });
      }
    },
    onError: (_err, variables) => {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.assumptionId);
        return next;
      });
    },
  });

  const handleValueChange = useCallback(
    (assumptionId: string, value: string) => {
      if (!baseScenarioId) return;
      setUpdatingIds((prev) => new Set(prev).add(assumptionId));
      updateMutation.mutate({
        scenarioId: baseScenarioId,
        assumptionId,
        value: value || null,
      });
    },
    [baseScenarioId, updateMutation],
  );

  // Group assumptions by category
  const groupedAssumptions = useMemo(() => {
    if (!assumptions) return [];

    const groups: { title: string; assumptions: typeof assumptions }[] = [];

    for (const category of CATEGORY_ORDER) {
      const categoryAssumptions = assumptions.filter((a) => a.category === category);
      if (categoryAssumptions.length > 0) {
        groups.push({
          title: CATEGORY_LABELS[category] ?? category,
          assumptions: categoryAssumptions,
        });
      }
    }

    // Any remaining categories not in the order
    const coveredCategories = new Set(CATEGORY_ORDER as unknown as string[]);
    const remaining = assumptions.filter((a) => !coveredCategories.has(a.category));
    if (remaining.length > 0) {
      groups.push({
        title: 'Other',
        assumptions: remaining,
      });
    }

    return groups;
  }, [assumptions]);

  const isLoading = modelLoading || assumptionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading assumptions...</p>
        </div>
      </div>
    );
  }

  if (!assumptions || assumptions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-12 text-center">
        <Settings2 className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No assumptions yet</h3>
        <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
          This model has no assumptions configured. Try creating a model from a template to get started with pre-filled values.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Assumptions</h2>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
          {assumptions.length}
        </span>
        {updatingIds.size > 0 && (
          <span className="flex items-center gap-1 text-xs text-primary">
            <Spinner size="sm" />
            Saving...
          </span>
        )}
      </div>

      {/* Assumption Sections */}
      <div className="space-y-3">
        {groupedAssumptions.map((group) => (
          <AssumptionSection
            key={group.title}
            title={group.title}
            assumptions={group.assumptions}
            onValueChange={handleValueChange}
            updatingIds={updatingIds}
          />
        ))}
      </div>
    </div>
  );
}

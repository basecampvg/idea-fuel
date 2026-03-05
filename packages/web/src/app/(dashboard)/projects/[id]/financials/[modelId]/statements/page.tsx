'use client';

import { use, useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/spinner';
import { PeriodSelector } from './components/period-selector';
import { StatementTable } from './components/statement-table';
import { SummaryDashboard } from './components/summary-dashboard';
import { BarChart3, FileText, Landmark, Banknote, LayoutDashboard } from 'lucide-react';

type StatementTab = 'summary' | 'pl' | 'bs' | 'cf';
type PeriodView = 'monthly' | 'quarterly' | 'annual';

const TABS: { key: StatementTab; label: string; icon: React.ReactNode }[] = [
  { key: 'summary', label: 'Summary', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { key: 'pl', label: 'P&L', icon: <FileText className="w-3.5 h-3.5" /> },
  { key: 'bs', label: 'Balance Sheet', icon: <Landmark className="w-3.5 h-3.5" /> },
  { key: 'cf', label: 'Cash Flow', icon: <Banknote className="w-3.5 h-3.5" /> },
];

export default function StatementsPage({
  params,
}: {
  params: Promise<{ id: string; modelId: string }>;
}) {
  const { modelId } = use(params);
  const [activeTab, setActiveTab] = useState<StatementTab>('summary');
  const [periodView, setPeriodView] = useState<PeriodView>('monthly');

  const { data: model, isLoading: modelLoading } = trpc.financial.get.useQuery({ id: modelId });
  const baseScenarioId = model?.scenarios?.find((s) => s.isBase)?.id;

  const {
    data: statements,
    isLoading: statementsLoading,
  } = trpc.financial.computeStatements.useQuery(
    { scenarioId: baseScenarioId! },
    { enabled: !!baseScenarioId, staleTime: 10_000 },
  );

  const isLoading = modelLoading || statementsLoading;

  const activeStatement = useMemo(() => {
    if (!statements) return null;
    switch (activeTab) {
      case 'pl': return statements.pl;
      case 'bs': return statements.bs;
      case 'cf': return statements.cf;
      default: return null;
    }
  }, [statements, activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Computing financial statements...</p>
        </div>
      </div>
    );
  }

  if (!statements) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-12 text-center">
        <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No statements available</h3>
        <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
          Add assumptions to your model to generate financial statements.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
                ${activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== 'summary' && (
          <PeriodSelector value={periodView} onChange={setPeriodView} />
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {activeTab === 'summary' ? (
          <div className="p-5">
            <SummaryDashboard pl={statements.pl} bs={statements.bs} cf={statements.cf} />
          </div>
        ) : activeStatement ? (
          <StatementTable
            lines={activeStatement.lines}
            periods={activeStatement.periods}
            periodView={periodView}
          />
        ) : null}
      </div>
    </div>
  );
}

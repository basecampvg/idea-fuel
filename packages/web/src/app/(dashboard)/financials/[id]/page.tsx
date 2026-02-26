'use client';

import { use } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/spinner';
import { KnowledgeLevelSelector } from './components/knowledge-level-selector';
import {
  Settings2,
  BarChart3,
  GitCompare,
  Camera,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react';

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function FinancialModelDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const { data: model, isLoading } = trpc.financial.get.useQuery({ id });
  const updateMutation = trpc.financial.update.useMutation({
    onSuccess: () => {
      utils.financial.get.invalidate({ id });
    },
  });

  if (isLoading || !model) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleKnowledgeLevelChange = (level: 'BEGINNER' | 'STANDARD' | 'EXPERT') => {
    updateMutation.mutate({ id, knowledgeLevel: level });
  };

  const quickLinks = [
    {
      label: 'Edit Assumptions',
      description: 'Configure your model inputs and variables',
      href: `/financials/${id}/assumptions`,
      icon: Settings2,
    },
    {
      label: 'View Statements',
      description: 'P&L, Balance Sheet, Cash Flow projections',
      href: `/financials/${id}/statements`,
      icon: BarChart3,
    },
    {
      label: 'Compare Scenarios',
      description: 'Test different what-if scenarios side by side',
      href: `/financials/${id}/scenarios`,
      icon: GitCompare,
    },
    {
      label: 'Manage Snapshots',
      description: 'Save and restore model state versions',
      href: `/financials/${id}/snapshots`,
      icon: Camera,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Model Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{model.name}</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {model.forecastYears}-year forecast
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Created {formatDate(model.createdAt)}
          </span>
          <span>
            {model.scenarios.length} scenario{model.scenarios.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Knowledge Level Selector */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">Detail Level</h3>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              Controls how many assumptions are visible. Switching levels doesn&apos;t delete any data.
            </p>
          </div>
          <KnowledgeLevelSelector
            value={model.knowledgeLevel as 'BEGINNER' | 'STANDARD' | 'EXPERT'}
            onChange={handleKnowledgeLevelChange}
            disabled={updateMutation.isPending}
          />
        </div>
      </div>

      {/* Scenarios Overview */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">Scenarios</h3>
          <Link
            href={`/financials/${id}/scenarios`}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Manage
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {model.scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium
                ${scenario.isBase
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-muted/50 text-muted-foreground border border-border'
                }
              `}
            >
              {scenario.name}
              {scenario.isBase && (
                <span className="ml-1.5 text-[10px] opacity-60">BASE</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="group">
              <div className="p-5 rounded-2xl border border-border bg-card hover:bg-card/80 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-primary/5 text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {link.label}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  {link.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

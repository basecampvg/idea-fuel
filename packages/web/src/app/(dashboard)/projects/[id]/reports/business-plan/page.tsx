'use client';

import { useProject } from '../../components/use-project-section';
import { trpc } from '@/lib/trpc/client';
import { FinancialChart } from './components/financial-chart';
import { ScoreRadar } from './components/score-radar';
import { GenerationStepper } from './components/generation-stepper';
import {
  FileText,
  Loader2,
  AlertCircle,
  BarChart3,
  Users,
  TrendingUp,
  Shield,
  Rocket,
  DollarSign,
  Lightbulb,
  Cpu,
  Building2,
  Crosshair,
  HandCoins,
  LogOut,
  Download,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

// ============================================================================
// Types (mirroring BusinessPlanProse from server)
// ============================================================================

interface FinancialProjections {
  year1: { revenue: number; costs: number; profit: number };
  year2: { revenue: number; costs: number; profit: number };
  year3: { revenue: number; costs: number; profit: number };
  breakEvenMonth: number;
  assumptions: string[];
}

interface BusinessPlanProse {
  executiveSummary: string;
  problemNarrative: string;
  solutionNarrative: string;
  marketNarrative: string;
  competitiveNarrative: string;
  businessModelNarrative: string;
  gtmStrategy: string;
  customerProfile: string;
  financialNarrative: string;
  financialProjections: FinancialProjections;
  productRoadmap: string;
  teamOperations: string;
  riskAnalysis: string;
  fundingRequirements: string;
  exitStrategy: string;
}

interface Competitor {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  positioning: string;
  website?: string;
  fundingStage?: string;
  estimatedRevenue?: string;
  targetSegment?: string;
  pricingModel?: string;
  keyDifferentiator?: string;
  vulnerability?: string;
}

interface PainPoint {
  pain: string;
  severity: string;
  frequency?: string;
  currentSolution?: string;
}

interface OfferTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  targetCustomer: string;
}

// ============================================================================
// Helpers
// ============================================================================

function parseProse(raw: string | unknown | null): BusinessPlanProse | null {
  if (!raw) return null;
  try {
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function parseJson<T>(data: unknown): T | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data as T;
}

// ============================================================================
// Section Components
// ============================================================================

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="font-display text-lg font-extrabold uppercase text-foreground">{title}</h2>
    </div>
  );
}

function ProseBlock({ text }: { text: string }) {
  return (
    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
      {text}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-background border border-border p-6 print:break-inside-avoid">
      <SectionHeader icon={icon} title={title} />
      {children}
    </section>
  );
}

function CompetitorTable({ competitors }: { competitors: Competitor[] }) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 font-mono uppercase tracking-wider text-muted-foreground">Name</th>
            <th className="text-left py-2 px-2 font-mono uppercase tracking-wider text-muted-foreground">Positioning</th>
            <th className="text-left py-2 px-2 font-mono uppercase tracking-wider text-muted-foreground">Differentiator</th>
            <th className="text-left py-2 px-2 font-mono uppercase tracking-wider text-muted-foreground">Vulnerability</th>
          </tr>
        </thead>
        <tbody>
          {competitors.slice(0, 6).map((c) => (
            <tr key={c.name} className="border-b border-border/50">
              <td className="py-2 px-2 font-medium text-foreground">{c.name}</td>
              <td className="py-2 px-2 text-muted-foreground">{c.positioning}</td>
              <td className="py-2 px-2 text-muted-foreground">{c.keyDifferentiator || '-'}</td>
              <td className="py-2 px-2 text-muted-foreground">{c.vulnerability || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PainPointsTable({ painPoints }: { painPoints: PainPoint[] }) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 font-mono uppercase tracking-wider text-muted-foreground">Pain Point</th>
            <th className="text-left py-2 px-2 font-mono uppercase tracking-wider text-muted-foreground">Severity</th>
            <th className="text-left py-2 px-2 font-mono uppercase tracking-wider text-muted-foreground">Current Solution</th>
          </tr>
        </thead>
        <tbody>
          {painPoints.slice(0, 8).map((p, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 px-2 text-foreground">{p.pain}</td>
              <td className="py-2 px-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  p.severity === 'high' || p.severity === 'critical'
                    ? 'bg-red-500/10 text-red-400'
                    : p.severity === 'medium'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {p.severity}
                </span>
              </td>
              <td className="py-2 px-2 text-muted-foreground">{p.currentSolution || 'None'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValueLadderTable({ tiers }: { tiers: OfferTier[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
      {tiers.slice(0, 3).map((tier) => (
        <div key={tier.name} className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-display text-sm font-bold text-foreground">{tier.name}</h4>
          <p className="text-lg font-black text-primary mt-1">{tier.price}</p>
          <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
          <ul className="mt-3 space-y-1">
            {(tier.features ?? []).slice(0, 5).map((f, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">-</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MarketSizingCards({ marketSizing }: { marketSizing: Record<string, unknown> }) {
  const tam = marketSizing.tam as { formattedValue?: string; growthRate?: number } | undefined;
  const sam = marketSizing.sam as { formattedValue?: string; growthRate?: number } | undefined;
  const som = marketSizing.som as { formattedValue?: string; growthRate?: number } | undefined;

  if (!tam && !sam && !som) return null;

  const cards = [
    { label: 'TAM', data: tam },
    { label: 'SAM', data: sam },
    { label: 'SOM', data: som },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mt-4">
      {cards.map(({ label, data }) => (
        <div key={label} className="rounded-lg border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-xl font-black text-foreground">{data?.formattedValue ?? 'N/A'}</p>
          {data?.growthRate != null && (
            <p className="text-xs text-primary mt-0.5">
              <TrendingUp className="w-3 h-3 inline mr-0.5" />
              {data.growthRate}% CAGR
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function BusinessPlanReportPage() {
  const { project, isLoading: projectLoading } = useProject();
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const isPrintMode = searchParams.get('print') === 'true';
  const research = project?.research as Record<string, unknown> | null | undefined;
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = useCallback(async () => {
    if (!research?.id || isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch('/api/research/business-plan/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchId: research.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'Business-Plan.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PDF Export]', err);
    } finally {
      setIsExporting(false);
    }
  }, [research?.id, isExporting]);

  const generateMutation = trpc.research.generateBusinessPlan.useMutation({
    onSuccess: () => {
      // Start polling by invalidating the project query
      utils.project.get.invalidate();
    },
    onError: (err) => {
      setTriggerError(err.message);
    },
  });

  // Poll for updates when status is GENERATING
  const bpStatus = research?.businessPlanStatus as string | null | undefined;
  trpc.project.get.useQuery(
    { id: project?.id ?? '' },
    {
      enabled: bpStatus === 'GENERATING',
      refetchInterval: bpStatus === 'GENERATING' ? 5000 : false,
    },
  );

  // Loading
  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No research or research not complete
  if (!research || research.status !== 'COMPLETE') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
          <BarChart3 className="w-7 h-7 text-accent/50" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Business Plan</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Your research must be complete before generating a business plan.
        </p>
      </div>
    );
  }

  // Currently generating
  if (bpStatus === 'GENERATING') {
    const subStatus = research?.businessPlanSubStatus as string | null;
    return <GenerationStepper subStatus={subStatus} />;
  }

  // Failed
  if (bpStatus === 'FAILED') {
    const errorMsg = research.businessPlanError as string | null;
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Generation Failed</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {errorMsg || 'An error occurred while generating the business plan.'}
        </p>
      </div>
    );
  }

  // Has business plan — render the full report
  const rawPlan = research.businessPlan;
  const prose = parseProse(rawPlan);

  if (prose) {
    const competitors = parseJson<Competitor[]>(research.competitors) ?? [];
    const painPoints = parseJson<PainPoint[]>(research.painPoints) ?? [];
    const valueLadder = parseJson<OfferTier[]>(research.valueLadder) ?? [];
    const marketSizing = parseJson<Record<string, unknown>>(research.marketSizing);
    const scores = {
      opportunity: research.opportunityScore as number | null,
      problem: research.problemScore as number | null,
      feasibility: research.feasibilityScore as number | null,
      whyNow: research.whyNowScore as number | null,
    };

    return (
      <div className="space-y-6 print:space-y-4" id="business-plan-report">
        {/* Report Header */}
        <div className="rounded-2xl bg-background border border-border p-6 print:border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-extrabold text-foreground">
                  {project?.title ?? 'Business Plan'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Comprehensive Business Plan &middot; Generated by Forge AI
                </p>
              </div>
            </div>
            {!isPrintMode && <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 print:hidden"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export PDF
                </>
              )}
            </button>}
          </div>
        </div>

        {/* Executive Summary */}
        <Section icon={FileText} title="Executive Summary">
          <ProseBlock text={prose.executiveSummary} />
          {(scores.opportunity != null || scores.problem != null) && (
            <div className="mt-5 pt-5 border-t border-border">
              <ScoreRadar scores={scores} />
            </div>
          )}
        </Section>

        {/* Problem & Pain Points */}
        <Section icon={AlertCircle} title="Problem Analysis">
          <ProseBlock text={prose.problemNarrative} />
          {painPoints.length > 0 && <PainPointsTable painPoints={painPoints} />}
        </Section>

        {/* Solution */}
        <Section icon={Lightbulb} title="Solution">
          <ProseBlock text={prose.solutionNarrative} />
        </Section>

        {/* Market Analysis */}
        <Section icon={TrendingUp} title="Market Analysis">
          <ProseBlock text={prose.marketNarrative} />
          {marketSizing && <MarketSizingCards marketSizing={marketSizing} />}
        </Section>

        {/* Competitive Landscape */}
        <Section icon={Crosshair} title="Competitive Landscape">
          <ProseBlock text={prose.competitiveNarrative} />
          {competitors.length > 0 && <CompetitorTable competitors={competitors} />}
        </Section>

        {/* Business Model & Revenue */}
        <Section icon={DollarSign} title="Business Model">
          <ProseBlock text={prose.businessModelNarrative} />
          {valueLadder.length > 0 && <ValueLadderTable tiers={valueLadder} />}
        </Section>

        {/* Go-to-Market Strategy */}
        <Section icon={Rocket} title="Go-to-Market Strategy">
          <ProseBlock text={prose.gtmStrategy} />
        </Section>

        {/* Customer Profile */}
        <Section icon={Users} title="Customer Profile">
          <ProseBlock text={prose.customerProfile} />
        </Section>

        {/* Financial Projections */}
        <Section icon={BarChart3} title="Financial Projections">
          <ProseBlock text={prose.financialNarrative} />
          {prose.financialProjections && (
            <div className="mt-5">
              <FinancialChart projections={prose.financialProjections} />
            </div>
          )}
        </Section>

        {/* Product Roadmap */}
        <Section icon={Cpu} title="Product & Technology Roadmap">
          <ProseBlock text={prose.productRoadmap} />
        </Section>

        {/* Team & Operations */}
        <Section icon={Building2} title="Team & Operations">
          <ProseBlock text={prose.teamOperations} />
        </Section>

        {/* Risk Analysis */}
        <Section icon={Shield} title="Risk Analysis">
          <ProseBlock text={prose.riskAnalysis} />
        </Section>

        {/* Funding Requirements */}
        <Section icon={HandCoins} title="Funding Requirements">
          <ProseBlock text={prose.fundingRequirements} />
        </Section>

        {/* Exit Strategy */}
        <Section icon={LogOut} title="Exit Strategy">
          <ProseBlock text={prose.exitStrategy} />
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4 print:py-2">
          Generated by Forge AI &middot; {new Date().toLocaleDateString()}
        </div>
      </div>
    );
  }

  // Ready to generate (no plan yet, research complete)
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <FileText className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Generate Business Plan</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        Create a comprehensive, investor-ready business plan from your research data.
        This typically takes 2-5 minutes.
      </p>

      {triggerError && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 max-w-sm">
          <p className="text-xs text-destructive">{triggerError}</p>
        </div>
      )}

      <button
        onClick={() => {
          setTriggerError(null);
          generateMutation.mutate({ researchId: research.id as string });
        }}
        disabled={generateMutation.isPending}
        className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Starting...
          </>
        ) : (
          'Generate Business Plan'
        )}
      </button>
    </div>
  );
}

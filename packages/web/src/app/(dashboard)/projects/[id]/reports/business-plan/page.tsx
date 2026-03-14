'use client';

import { useProject } from '../../components/use-project-section';
import { trpc } from '@/lib/trpc/client';
import { FinancialChart } from './components/financial-chart';
import { ScoreRadar } from './components/score-radar';
import { GenerationStepper } from './components/generation-stepper';
import ReactMarkdown from 'react-markdown';
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
  Palette,
  Check,
  CheckCircle2,
  Pencil,
  X,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { COVER_VARIANTS, type CoverStyleId } from './components/cover-variants';

// ============================================================================
// Types (mirroring BusinessPlanProse from server)
// ============================================================================

interface FinancialProjections {
  year1: { revenue: number; costs: number; profit: number };
  year2: { revenue: number; costs: number; profit: number };
  year3: { revenue: number; costs: number; profit: number };
  breakEvenMonth: number;
  assumptions: string[];
  source?: 'model' | 'ai_estimate';
  modelId?: string;
  templateSlug?: string;
  richAssumptions?: Array<{
    key: string; name: string; value: number; unit: string | null;
    category: string; confidence: string;
  }>;
  monthlyPL?: Array<{ period: string; revenue: number; costs: number; profit: number }>;
  breakEvenDetail?: {
    revenueModel: string; breakEvenPoint: number; breakEvenUnit: string;
    trajectory: Array<{
      month: number; revenue: number; totalCosts: number;
      profit: number; cumulativeProfit: number;
    }>;
  };
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

type ProseSectionKey =
  | 'executiveSummary' | 'problemNarrative' | 'solutionNarrative'
  | 'marketNarrative' | 'competitiveNarrative' | 'businessModelNarrative'
  | 'gtmStrategy' | 'customerProfile' | 'financialNarrative'
  | 'productRoadmap' | 'teamOperations' | 'riskAnalysis'
  | 'fundingRequirements' | 'exitStrategy';

function ProseBlock({ text }: { text: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_strong]:text-foreground [&_li]:my-0.5">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

function EditableSection({
  icon: Icon,
  title,
  sectionKey,
  text,
  researchId,
  children,
}: {
  icon: React.ElementType;
  title: string;
  sectionKey: ProseSectionKey;
  text: string;
  researchId: string;
  children?: React.ReactNode;
}) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  const saveMutation = trpc.research.updateBusinessPlanSection.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate();
      setEditing(false);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({ researchId, section: sectionKey, value: draft });
  };

  const handleCancel = () => {
    setDraft(text);
    setEditing(false);
  };

  return (
    <section className="rounded-2xl bg-background border border-border p-6 print:break-inside-avoid group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-display text-lg font-extrabold uppercase text-foreground">{title}</h2>
        </div>
        {!editing ? (
          <button
            onClick={() => { setDraft(text); setEditing(true); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[200px] resize-y rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
          autoFocus
        />
      ) : (
        <ProseBlock text={text} />
      )}

      {!editing && children}
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
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const currentCoverStyle = (research?.businessPlanCoverStyle as string) ?? '1';

  const coverStyleMutation = trpc.research.updateBusinessPlanCoverStyle.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate();
    },
  });

  const handleExportPdf = useCallback(() => {
    if (!project?.id) return;
    window.open(
      `/print/business-plan/${project.id}?cover=${currentCoverStyle}&autoprint=true`,
      '_blank',
    );
  }, [project?.id, currentCoverStyle]);

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
            {!isPrintMode && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowCoverPicker(!showCoverPicker)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Palette className="w-4 h-4" />
                    Cover Style
                  </button>

                  {showCoverPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowCoverPicker(false)} />
                      <div className="absolute right-0 top-full mt-2 z-50 w-[480px] rounded-xl border border-border bg-card p-4 shadow-xl">
                        <p className="text-xs font-medium text-muted-foreground mb-3">Choose PDF cover design</p>
                        <div className="grid grid-cols-4 gap-3">
                          {COVER_VARIANTS.map(({ id, name, Component }) => {
                            const isSelected = currentCoverStyle === id;
                            return (
                              <button
                                key={id}
                                onClick={() => {
                                  coverStyleMutation.mutate({
                                    researchId: research!.id as string,
                                    coverStyle: id as CoverStyleId,
                                  });
                                  setShowCoverPicker(false);
                                }}
                                className={`group relative rounded-lg overflow-hidden border-2 transition-all ${
                                  isSelected
                                    ? 'border-primary ring-2 ring-primary/20'
                                    : 'border-border hover:border-muted-foreground/30'
                                }`}
                              >
                                <div style={{ aspectRatio: '210 / 297' }} className="relative">
                                  <div className="absolute inset-0" style={{ fontSize: '4px' }}>
                                    <Component
                                      title={project?.title ?? 'Business Plan'}
                                      subtitle={project?.description as string | undefined}
                                    />
                                  </div>
                                  {isSelected && (
                                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] text-center py-1.5 text-muted-foreground font-medium truncate px-1">
                                  {name}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Executive Summary */}
        <EditableSection icon={FileText} title="Executive Summary" sectionKey="executiveSummary" text={prose.executiveSummary} researchId={research.id as string}>
          {(scores.opportunity != null || scores.problem != null) && (
            <div className="mt-5 pt-5 border-t border-border">
              <ScoreRadar scores={scores} />
            </div>
          )}
        </EditableSection>

        {/* Problem & Pain Points */}
        <EditableSection icon={AlertCircle} title="Problem Analysis" sectionKey="problemNarrative" text={prose.problemNarrative} researchId={research.id as string}>
          {painPoints.length > 0 && <PainPointsTable painPoints={painPoints} />}
        </EditableSection>

        {/* Solution */}
        <EditableSection icon={Lightbulb} title="Solution" sectionKey="solutionNarrative" text={prose.solutionNarrative} researchId={research.id as string} />

        {/* Market Analysis */}
        <EditableSection icon={TrendingUp} title="Market Analysis" sectionKey="marketNarrative" text={prose.marketNarrative} researchId={research.id as string}>
          {marketSizing && <MarketSizingCards marketSizing={marketSizing} />}
        </EditableSection>

        {/* Competitive Landscape */}
        <EditableSection icon={Crosshair} title="Competitive Landscape" sectionKey="competitiveNarrative" text={prose.competitiveNarrative} researchId={research.id as string}>
          {competitors.length > 0 && <CompetitorTable competitors={competitors} />}
        </EditableSection>

        {/* Business Model & Revenue */}
        <EditableSection icon={DollarSign} title="Business Model" sectionKey="businessModelNarrative" text={prose.businessModelNarrative} researchId={research.id as string}>
          {valueLadder.length > 0 && <ValueLadderTable tiers={valueLadder} />}
        </EditableSection>

        {/* Go-to-Market Strategy */}
        <EditableSection icon={Rocket} title="Go-to-Market Strategy" sectionKey="gtmStrategy" text={prose.gtmStrategy} researchId={research.id as string} />

        {/* Customer Profile */}
        <EditableSection icon={Users} title="Customer Profile" sectionKey="customerProfile" text={prose.customerProfile} researchId={research.id as string} />

        {/* Financial Projections */}
        <EditableSection icon={BarChart3} title="Financial Projections" sectionKey="financialNarrative" text={prose.financialNarrative} researchId={research.id as string}>
          <div className="flex items-center gap-2 mt-1 mb-3">
            {prose.financialProjections?.source === 'model' ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Model-Backed
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-medium text-xs">
                AI Estimated
              </span>
            )}
          </div>
          {prose.financialProjections?.source === 'model' && prose.financialProjections.templateSlug && (
            <p className="text-xs text-muted-foreground mb-2">
              Projections computed from your {prose.financialProjections.templateSlug} financial model.
            </p>
          )}
          {prose.financialProjections && (
            <div className="mt-5">
              <FinancialChart projections={prose.financialProjections} />
            </div>
          )}
        </EditableSection>

        {/* Product Roadmap */}
        <EditableSection icon={Cpu} title="Product & Technology Roadmap" sectionKey="productRoadmap" text={prose.productRoadmap} researchId={research.id as string} />

        {/* Team & Operations */}
        <EditableSection icon={Building2} title="Team & Operations" sectionKey="teamOperations" text={prose.teamOperations} researchId={research.id as string} />

        {/* Risk Analysis */}
        <EditableSection icon={Shield} title="Risk Analysis" sectionKey="riskAnalysis" text={prose.riskAnalysis} researchId={research.id as string} />

        {/* Funding Requirements */}
        <EditableSection icon={HandCoins} title="Funding Requirements" sectionKey="fundingRequirements" text={prose.fundingRequirements} researchId={research.id as string} />

        {/* Exit Strategy */}
        <EditableSection icon={LogOut} title="Exit Strategy" sectionKey="exitStrategy" text={prose.exitStrategy} researchId={research.id as string} />

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

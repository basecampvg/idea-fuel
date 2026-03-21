'use client';

import { trpc } from '@/lib/trpc/client';
import { FinancialChart } from '@/app/(dashboard)/projects/[id]/reports/business-plan/components/financial-chart';
import { getCoverComponent, getBackCoverComponent } from '@/app/(dashboard)/projects/[id]/reports/business-plan/components/cover-variants';
import ReactMarkdown from 'react-markdown';
import { Loader2, TrendingUp } from 'lucide-react';
import { useSearchParams, useParams } from 'next/navigation';
import { useEffect } from 'react';

// ============================================================================
// Types
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
  problem?: string;
  pain?: string;
  severity: string;
  frequencyOfOccurrence?: string;
  frequency?: string;
  currentSolutions?: string[];
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

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================================
// Print Components
// ============================================================================

function CoverPage({ title, subtitle, coverStyle }: { title: string; subtitle?: string; coverStyle: string }) {
  const CoverComponent = getCoverComponent(coverStyle);
  return (
    <div className="print-cover-page" style={{ fontSize: '16px', height: '100vh' }}>
      <CoverComponent title={title} subtitle={subtitle} />
    </div>
  );
}

function SectionTitle({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-6 mt-2">
      <span className="text-sm font-mono text-red-600 tracking-wider">
        {String(number).padStart(2, '0')}
      </span>
      <h2 className="text-2xl font-extrabold text-neutral-900 uppercase tracking-wide">
        {title}
      </h2>
    </div>
  );
}

function Prose({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="prose prose-sm max-w-none text-neutral-700 leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-neutral-900 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-neutral-900 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-neutral-800 [&_strong]:text-neutral-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-neutral-700 [&_p]:mb-3">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

function PageBreak() {
  return <div className="print-page-break" />;
}

function CompetitorTable({ competitors }: { competitors: Competitor[] }) {
  return (
    <div className="mt-6">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-300">
            <th className="text-left py-2 pr-3 font-mono uppercase tracking-wider text-neutral-500 text-[10px]">Competitor</th>
            <th className="text-left py-2 pr-3 font-mono uppercase tracking-wider text-neutral-500 text-[10px]">Positioning</th>
            <th className="text-left py-2 pr-3 font-mono uppercase tracking-wider text-neutral-500 text-[10px]">Differentiator</th>
            <th className="text-left py-2 font-mono uppercase tracking-wider text-neutral-500 text-[10px]">Vulnerability</th>
          </tr>
        </thead>
        <tbody>
          {competitors.slice(0, 6).map((c) => (
            <tr key={c.name} className="border-b border-neutral-200">
              <td className="py-2.5 pr-3 font-medium text-neutral-800">{c.name}</td>
              <td className="py-2.5 pr-3 text-neutral-600">{c.positioning}</td>
              <td className="py-2.5 pr-3 text-neutral-600">{c.keyDifferentiator || '-'}</td>
              <td className="py-2.5 text-neutral-600">{c.vulnerability || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PainPointsTable({ painPoints }: { painPoints: PainPoint[] }) {
  return (
    <div className="mt-6">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-300">
            <th className="text-left py-2 pr-3 font-mono uppercase tracking-wider text-neutral-500 text-[10px]">Pain Point</th>
            <th className="text-left py-2 pr-3 font-mono uppercase tracking-wider text-neutral-500 text-[10px]">Severity</th>
            <th className="text-left py-2 font-mono uppercase tracking-wider text-neutral-500 text-[10px]">Current Solution</th>
          </tr>
        </thead>
        <tbody>
          {painPoints.slice(0, 8).map((p, i) => (
            <tr key={i} className="border-b border-neutral-200">
              <td className="py-2.5 pr-3 text-neutral-800">{p.problem ?? p.pain}</td>
              <td className="py-2.5 pr-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  p.severity === 'high' || p.severity === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : p.severity === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {p.severity}
                </span>
              </td>
              <td className="py-2.5 text-neutral-600">{p.currentSolutions?.join(', ') ?? p.currentSolution ?? 'None'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValueLadderTable({ tiers }: { tiers: OfferTier[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      {tiers.slice(0, 3).map((tier) => (
        <div key={tier.name} className="rounded-lg border border-neutral-200 p-4">
          <h4 className="text-sm font-bold text-neutral-800">{tier.name}</h4>
          <p className="text-lg font-black text-red-600 mt-1">{tier.price}</p>
          <p className="text-xs text-neutral-500 mt-1">{tier.description}</p>
          <ul className="mt-3 space-y-1">
            {(tier.features ?? []).slice(0, 5).map((f, i) => (
              <li key={i} className="text-xs text-neutral-600 flex items-start gap-1.5">
                <span className="text-red-600 mt-0.5">-</span>
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
    { label: 'TAM', desc: 'Total Addressable Market', data: tam },
    { label: 'SAM', desc: 'Serviceable Addressable Market', data: sam },
    { label: 'SOM', desc: 'Serviceable Obtainable Market', data: som },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      {cards.map(({ label, desc, data }) => (
        <div key={label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-neutral-500">{label}</p>
          <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
          <p className="mt-2 text-2xl font-black text-neutral-900">{data?.formattedValue ?? 'N/A'}</p>
          {data?.growthRate != null && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {data.growthRate}% CAGR
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ScoreSummary({ scores }: { scores: Record<string, number | null> }) {
  const items = [
    { key: 'opportunity', label: 'Opportunity' },
    { key: 'problem', label: 'Problem' },
    { key: 'feasibility', label: 'Feasibility' },
    { key: 'whyNow', label: 'Timing' },
  ].filter(item => scores[item.key] != null);

  if (items.length === 0) return null;

  const avg = items.reduce((sum, item) => sum + (scores[item.key] ?? 0), 0) / items.length;

  return (
    <div className="mt-6 flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-14 h-14 rounded-full border-2 border-red-600 flex items-center justify-center">
          <span className="text-xl font-black text-neutral-900">{Math.round(avg)}</span>
        </div>
        <span className="text-xs text-neutral-500 font-mono uppercase">Overall<br/>Score</span>
      </div>
      <div className="flex gap-4">
        {items.map(({ key, label }) => (
          <div key={key} className="text-center">
            <p className="text-lg font-bold text-neutral-800">{scores[key]}</p>
            <p className="text-[10px] text-neutral-500 font-mono uppercase">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Print Page (outside dashboard layout — no sidebar/nav)
// ============================================================================

export default function BusinessPlanPrintPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const searchParams = useSearchParams();
  const coverStyle = searchParams.get('cover') ?? '1';
  const autoprint = searchParams.get('autoprint') === 'true';

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );

  const research = project?.research as Record<string, unknown> | null | undefined;

  useEffect(() => {
    if (autoprint && !projectLoading && research?.businessPlan) {
      const timer = setTimeout(() => window.print(), 1500);
      return () => clearTimeout(timer);
    }
  }, [autoprint, projectLoading, research?.businessPlan]);

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!research || !research.businessPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <p className="text-neutral-400">No business plan available.</p>
      </div>
    );
  }

  const prose = parseProse(research.businessPlan);
  if (!prose) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <p className="text-neutral-400">Failed to parse business plan data.</p>
      </div>
    );
  }

  const competitors = parseJson<Competitor[]>(research.competitors) ?? [];
  const painPoints = parseJson<PainPoint[]>(research.painPoints) ?? [];
  const valueLadder = parseJson<OfferTier[]>(research.valueLadder) ?? [];
  const marketSizing = parseJson<Record<string, unknown>>(research.marketSizing);
  const scores: Record<string, number | null> = {
    opportunity: research.opportunityScore as number | null,
    problem: research.problemScore as number | null,
    feasibility: research.feasibilityScore as number | null,
    whyNow: research.whyNowScore as number | null,
  };

  // Build sections
  const sections: { number: number; title: string; content: React.ReactNode }[] = [];
  let sectionNum = 0;

  if (prose.executiveSummary) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Executive Summary',
      content: (
        <>
          <Prose text={prose.executiveSummary} />
          <ScoreSummary scores={scores} />
        </>
      ),
    });
  }

  if (prose.problemNarrative) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Problem Analysis',
      content: (
        <>
          <Prose text={prose.problemNarrative} />
          {painPoints.length > 0 && <PainPointsTable painPoints={painPoints} />}
        </>
      ),
    });
  }

  if (prose.solutionNarrative) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Solution',
      content: <Prose text={prose.solutionNarrative} />,
    });
  }

  if (prose.marketNarrative) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Market Analysis',
      content: (
        <>
          <Prose text={prose.marketNarrative} />
          {marketSizing && <MarketSizingCards marketSizing={marketSizing} />}
        </>
      ),
    });
  }

  if (prose.competitiveNarrative) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Competitive Landscape',
      content: (
        <>
          <Prose text={prose.competitiveNarrative} />
          {competitors.length > 0 && <CompetitorTable competitors={competitors} />}
        </>
      ),
    });
  }

  if (prose.businessModelNarrative) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Business Model',
      content: (
        <>
          <Prose text={prose.businessModelNarrative} />
          {valueLadder.length > 0 && <ValueLadderTable tiers={valueLadder} />}
        </>
      ),
    });
  }

  if (prose.gtmStrategy) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Go-to-Market Strategy',
      content: <Prose text={prose.gtmStrategy} />,
    });
  }

  if (prose.customerProfile) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Customer Profile',
      content: <Prose text={prose.customerProfile} />,
    });
  }

  if (prose.financialNarrative || prose.financialProjections) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Financial Projections',
      content: (
        <>
          <Prose text={prose.financialNarrative} />
          {prose.financialProjections && (
            <div className="mt-6">
              <FinancialChart projections={prose.financialProjections} />
            </div>
          )}
        </>
      ),
    });
  }

  if (prose.productRoadmap) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Product & Technology Roadmap',
      content: <Prose text={prose.productRoadmap} />,
    });
  }

  if (prose.teamOperations) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Team & Operations',
      content: <Prose text={prose.teamOperations} />,
    });
  }

  if (prose.riskAnalysis) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Risk Analysis',
      content: <Prose text={prose.riskAnalysis} />,
    });
  }

  if (prose.fundingRequirements) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Funding Requirements',
      content: <Prose text={prose.fundingRequirements} />,
    });
  }

  if (prose.exitStrategy) {
    sectionNum++;
    sections.push({
      number: sectionNum,
      title: 'Exit Strategy',
      content: <Prose text={prose.exitStrategy} />,
    });
  }

  return (
    <div id="business-plan-report" className="print-document bg-white text-neutral-900 min-h-screen">
      <style>{`
        @media print {
          /* Default: content pages get margins */
          @page {
            size: A4;
            margin: 14mm 18mm;
          }
          /* Cover: full bleed */
          @page :first {
            margin: 0;
          }
          /* Back cover: full bleed via named page */
          @page back-cover {
            margin: 0;
          }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            background-color: white !important;
            --background: 0 0% 100% !important;
          }
          .print-document {
            max-width: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .print-cover-page {
            width: 100%;
            height: 100vh;
            page-break-after: always;
          }
          .print-back-page {
            page: back-cover;
            width: 100%;
            height: 100vh;
          }
          .print-page-break {
            page-break-before: always;
          }
          /* Keep section title with its content */
          .print-section h2,
          .print-section .flex.items-baseline {
            break-after: avoid;
          }
          /* Prevent orphaned lines and mid-element splits */
          .print-section p {
            orphans: 3;
            widows: 3;
          }
          .print-section li {
            break-inside: avoid;
          }
          .print-section tr {
            break-inside: avoid;
          }
          /* Keep visual blocks together — push to next page if they don't fit */
          .print-section .grid,
          .print-section .grid > *,
          .print-section table,
          .print-section .recharts-responsive-container,
          .print-section > div > .mt-6 {
            break-inside: avoid;
          }
        }

        /* Screen preview styling */
        @media screen {
          .print-document {
            max-width: 850px;
            margin: 0 auto;
          }
        }
        .print-document {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>

      {/* Cover Page */}
      <CoverPage
        title={project?.title ?? 'Business Plan'}
        subtitle={project?.description as string | undefined}
        coverStyle={coverStyle}
      />

      {/* Sections */}
      {sections.map((s) => (
        <div key={s.number}>
          <div className="print-section px-16 py-7">
            <SectionTitle number={s.number} title={s.title} />
            {s.content}
          </div>
        </div>
      ))}

      {/* Back page */}
      <div className="print-back-page">
        {(() => {
          const BackCover = getBackCoverComponent(coverStyle);
          return <BackCover />;
        })()}
      </div>
    </div>
  );
}

// Import fonts first to ensure they're registered before any PDF rendering
import './fonts';

import type { ReactElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { BusinessPlanPDF } from './templates/business-plan';
import { PositioningPDF } from './templates/positioning';
import { CompetitiveAnalysisPDF } from './templates/competitive-analysis';

// Report types enum (matches Prisma schema)
type ReportType =
  | 'BUSINESS_PLAN'
  | 'POSITIONING'
  | 'COMPETITIVE_ANALYSIS'
  | 'WHY_NOW'
  | 'PROOF_SIGNALS'
  | 'KEYWORDS_SEO'
  | 'CUSTOMER_PROFILE'
  | 'VALUE_EQUATION'
  | 'VALUE_LADDER'
  | 'GO_TO_MARKET';

type ReportTier = 'BASIC' | 'PRO' | 'FULL';

interface IdeaData {
  id: string;
  title: string;
  description: string;
}

interface ResearchData {
  marketAnalysis?: unknown;
  competitors?: unknown;
  painPoints?: unknown;
  positioning?: unknown;
  whyNow?: unknown;
  proofSignals?: unknown;
  keywords?: unknown;
  opportunityScore?: number | null;
  problemScore?: number | null;
  feasibilityScore?: number | null;
  whyNowScore?: number | null;
  valueLadder?: unknown;
}

interface ReportData {
  id: string;
  type: ReportType;
  tier: ReportTier;
  title: string;
  content: string;
  sections: unknown;
}

interface GeneratePDFOptions {
  idea: IdeaData;
  report: ReportData;
  research?: ResearchData | null;
}

/**
 * Parse research data safely
 */
function parseResearchData(research: ResearchData | null | undefined) {
  if (!research) return {};

  const parse = (data: unknown) => {
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  };

  return {
    marketAnalysis: parse(research.marketAnalysis),
    competitors: parse(research.competitors),
    painPoints: parse(research.painPoints),
    positioning: parse(research.positioning),
    whyNow: parse(research.whyNow),
    proofSignals: parse(research.proofSignals),
    keywords: parse(research.keywords),
    valueLadder: parse(research.valueLadder),
    scores: {
      opportunity: research.opportunityScore ?? undefined,
      problem: research.problemScore ?? undefined,
      feasibility: research.feasibilityScore ?? undefined,
      whyNow: research.whyNowScore ?? undefined,
    },
  };
}

/**
 * Parse report content (markdown or JSON)
 */
function parseReportContent(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content);
  } catch {
    // Content is markdown, return as-is
    return { rawContent: content };
  }
}

/**
 * Transform data for Business Plan PDF
 */
function transformBusinessPlanData(
  idea: IdeaData,
  report: ReportData,
  research: ReturnType<typeof parseResearchData>
) {
  const content = parseReportContent(report.content);
  const marketAnalysis = research.marketAnalysis as Record<string, unknown> | null;
  const competitors = research.competitors as Array<Record<string, unknown>> | null;
  const positioning = research.positioning as Record<string, unknown> | null;

  return {
    ideaTitle: idea.title,
    ideaDescription: idea.description,
    generatedAt: new Date(),
    tier: report.tier,

    executiveSummary: (content.executiveSummary as string) || (content.rawContent as string) || idea.description,
    problemStatement: (content.problem as string) || (positioning?.problemStatement as string),
    solution: (content.solution as string) || (positioning?.solution as string),
    uniqueValueProposition: (content.uvp as string) || (positioning?.uvp as string),

    targetMarket: (marketAnalysis?.targetMarket as string) || (content.targetMarket as string),
    marketSize: (marketAnalysis?.marketSize as string) || (content.marketSize as string),
    marketTrends: (marketAnalysis?.trends as string[]) || (content.trends as string[]),

    competitors: competitors?.slice(0, 4).map((c) => ({
      name: (c.name as string) || 'Unknown',
      strengths: (c.strengths as string) || 'N/A',
      weaknesses: (c.weaknesses as string) || 'N/A',
    })),
    competitiveAdvantage: (content.competitiveAdvantage as string) || (positioning?.competitiveAdvantage as string),

    revenueStreams: (content.revenueStreams as string[]),
    pricingStrategy: (content.pricingStrategy as string),
    costStructure: (content.costStructure as string),

    marketingStrategy: (content.marketingStrategy as string),
    salesChannels: (content.salesChannels as string[]),
    customerAcquisition: (content.customerAcquisition as string),

    financialProjections: (content.financialProjections as {
      year1Revenue?: string;
      year2Revenue?: string;
      year3Revenue?: string;
      breakEvenPoint?: string;
    }),

    teamRequirements: (content.teamRequirements as string[]),
    milestones: (content.milestones as Array<{ milestone: string; timeline: string }>),

    scores: research.scores,
  };
}

/**
 * Transform data for Positioning PDF
 */
function transformPositioningData(
  idea: IdeaData,
  report: ReportData,
  research: ReturnType<typeof parseResearchData>
) {
  const content = parseReportContent(report.content);
  const positioning = research.positioning as Record<string, unknown> | null;
  const painPoints = research.painPoints as Array<Record<string, unknown>> | null;

  return {
    ideaTitle: idea.title,
    ideaDescription: idea.description,
    generatedAt: new Date(),
    tier: report.tier,

    positioningStatement: (content.positioningStatement as string) || (positioning?.statement as string),
    tagline: (content.tagline as string) || (positioning?.tagline as string),
    brandVoice: (content.brandVoice as string),
    brandPersonality: (content.brandPersonality as string[]),

    targetAudience: (content.targetAudience as string) || (positioning?.targetAudience as string),
    customerPersona: (content.customerPersona as {
      name: string;
      demographics: string;
      psychographics: string;
      painPoints: string[];
      goals: string[];
    }),

    keyMessages: (content.keyMessages as string[]),
    valuePillars: (content.valuePillars as Array<{ pillar: string; description: string }>),

    uniqueSellingPoints: (content.uniqueSellingPoints as string[]) ||
      painPoints?.map((p) => p.solution as string).filter(Boolean),
    competitivePositioning: (content.competitivePositioning as string),

    brandColors: (content.brandColors as string[]),
    visualStyle: (content.visualStyle as string),
    toneGuidelines: (content.toneGuidelines as string[]),

    channelMessaging: (content.channelMessaging as Array<{
      channel: string;
      headline: string;
      subheadline: string;
      cta: string;
    }>),
  };
}

/**
 * Transform data for Competitive Analysis PDF
 */
function transformCompetitiveAnalysisData(
  idea: IdeaData,
  report: ReportData,
  research: ReturnType<typeof parseResearchData>
) {
  const content = parseReportContent(report.content);
  const marketAnalysis = research.marketAnalysis as Record<string, unknown> | null;
  const competitors = research.competitors as Array<Record<string, unknown>> | null;

  return {
    ideaTitle: idea.title,
    ideaDescription: idea.description,
    generatedAt: new Date(),
    tier: report.tier,

    marketOverview: (content.marketOverview as string) || (marketAnalysis?.overview as string),
    industryTrends: (content.industryTrends as string[]) || (marketAnalysis?.trends as string[]),

    competitors: competitors?.slice(0, 4).map((c) => ({
      name: (c.name as string) || 'Unknown Competitor',
      description: (c.description as string) || 'No description available',
      website: c.website as string | undefined,
      pricing: c.pricing as string | undefined,
      strengths: Array.isArray(c.strengths) ? c.strengths : [c.strengths || 'N/A'],
      weaknesses: Array.isArray(c.weaknesses) ? c.weaknesses : [c.weaknesses || 'N/A'],
      targetAudience: c.targetAudience as string | undefined,
    })),

    swot: (content.swot as {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    }),

    competitiveAdvantages: (content.competitiveAdvantages as string[]),
    differentiators: (content.differentiators as string[]),

    marketGaps: (content.marketGaps as string[]),
    underservedSegments: (content.underservedSegments as string[]),

    strategicRecommendations: (content.strategicRecommendations as string[]),
    competitiveStrategy: (content.competitiveStrategy as string),
  };
}

/**
 * Generate PDF buffer for a report
 */
export async function generatePDFBuffer(options: GeneratePDFOptions): Promise<Buffer> {
  const { idea, report, research } = options;
  const parsedResearch = parseResearchData(research);

  let pdfDocument: ReactElement;

  switch (report.type) {
    case 'BUSINESS_PLAN': {
      const data = transformBusinessPlanData(idea, report, parsedResearch);
      pdfDocument = <BusinessPlanPDF data={data} />;
      break;
    }

    case 'POSITIONING': {
      const data = transformPositioningData(idea, report, parsedResearch);
      pdfDocument = <PositioningPDF data={data} />;
      break;
    }

    case 'COMPETITIVE_ANALYSIS': {
      const data = transformCompetitiveAnalysisData(idea, report, parsedResearch);
      pdfDocument = <CompetitiveAnalysisPDF data={data} />;
      break;
    }

    // For unsupported report types, generate a basic PDF
    default: {
      const data = transformBusinessPlanData(idea, report, parsedResearch);
      pdfDocument = <BusinessPlanPDF data={{ ...data, tier: 'BASIC' }} />;
      break;
    }
  }

  try {
    // Render to buffer - cast to any to work around typing issue with @react-pdf/renderer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(pdfDocument as any);
    return Buffer.from(buffer);
  } catch (error) {
    // Log detailed error for debugging
    console.error('PDF generation error:', {
      reportType: report.type,
      ideaId: idea.id,
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get filename for a report PDF
 */
export function getPDFFilename(ideaTitle: string, reportType: ReportType): string {
  const sanitizedTitle = ideaTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  const typeLabel = reportType.toLowerCase().replace(/_/g, '-');
  const date = new Date().toISOString().split('T')[0];

  return `forge-${sanitizedTitle}-${typeLabel}-${date}.pdf`;
}

export type { GeneratePDFOptions, ReportType, ReportTier };

// Import fonts first to ensure they're registered before any PDF rendering
import './fonts';

import type { ReactElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { PositioningPDF } from './templates/positioning';
import { CompetitiveAnalysisPDF } from './templates/competitive-analysis';

// Report types enum (matches DB schema)
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

interface ProjectData {
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
  // Additional research fields
  scoreJustifications?: unknown;
  scoreMetadata?: unknown;
  revenuePotential?: unknown;
  executionDifficulty?: unknown;
  gtmClarity?: unknown;
  founderFit?: unknown;
  keywordTrends?: unknown;
  actionPrompts?: unknown;
  userStory?: unknown;
  socialProof?: unknown;
  marketSizing?: unknown;
  techStack?: unknown;
  swot?: unknown;
  synthesizedInsights?: unknown;
  sparkResult?: unknown;
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
  project: ProjectData;
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
    scoreJustifications: parse(research.scoreJustifications),
    scoreMetadata: parse(research.scoreMetadata),
    revenuePotential: parse(research.revenuePotential),
    executionDifficulty: parse(research.executionDifficulty),
    gtmClarity: parse(research.gtmClarity),
    founderFit: parse(research.founderFit),
    keywordTrends: parse(research.keywordTrends),
    actionPrompts: parse(research.actionPrompts),
    userStory: parse(research.userStory),
    socialProof: parse(research.socialProof),
    marketSizing: parse(research.marketSizing),
    techStack: parse(research.techStack),
    swot: parse(research.swot),
    synthesizedInsights: parse(research.synthesizedInsights),
    sparkResult: parse(research.sparkResult),
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
 * Transform data for Positioning PDF
 */
function transformPositioningData(
  project: ProjectData,
  report: ReportData,
  research: ReturnType<typeof parseResearchData>
) {
  const content = parseReportContent(report.content);
  const positioning = research.positioning as Record<string, unknown> | null;
  const painPoints = research.painPoints as Array<Record<string, unknown>> | null;

  return {
    ideaTitle: project.title,
    ideaDescription: project.description,
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
  project: ProjectData,
  report: ReportData,
  research: ReturnType<typeof parseResearchData>
) {
  const content = parseReportContent(report.content);
  const marketAnalysis = research.marketAnalysis as Record<string, unknown> | null;
  const competitors = research.competitors as Array<Record<string, unknown>> | null;

  return {
    ideaTitle: project.title,
    ideaDescription: project.description,
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
    }) || (research.swot as {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    } | null),

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
  const { project, report, research } = options;

  console.log('[PDF Generator] Starting PDF generation:', {
    projectId: project.id,
    projectTitle: project.title?.slice(0, 50),
    reportType: report.type,
    reportTier: report.tier,
    hasResearch: !!research,
  });

  // Parse research data with error handling
  let parsedResearch: ReturnType<typeof parseResearchData>;
  try {
    parsedResearch = parseResearchData(research);
    console.log('[PDF Generator] Research data parsed:', {
      hasMarketAnalysis: !!parsedResearch.marketAnalysis,
      hasCompetitors: !!parsedResearch.competitors,
      hasPainPoints: !!parsedResearch.painPoints,
      hasPositioning: !!parsedResearch.positioning,
    });
  } catch (parseError) {
    console.error('[PDF Generator] Failed to parse research data:', parseError);
    parsedResearch = {};
  }

  let pdfDocument: ReactElement;
  let transformedData: unknown;

  try {
    switch (report.type) {
      case 'BUSINESS_PLAN': {
        // Business plan PDFs are now generated via Puppeteer (see /api/research/business-plan/export)
        throw new Error('Business plan PDF generation has moved to the Puppeteer export endpoint');
      }

      case 'POSITIONING': {
        transformedData = transformPositioningData(project, report, parsedResearch);
        console.log('[PDF Generator] Positioning data transformed');
        pdfDocument = <PositioningPDF data={transformedData as Parameters<typeof PositioningPDF>[0]['data']} />;
        break;
      }

      case 'COMPETITIVE_ANALYSIS': {
        transformedData = transformCompetitiveAnalysisData(project, report, parsedResearch);
        console.log('[PDF Generator] Competitive analysis data transformed');
        pdfDocument = <CompetitiveAnalysisPDF data={transformedData as Parameters<typeof CompetitiveAnalysisPDF>[0]['data']} />;
        break;
      }

      default: {
        throw new Error(`Unsupported report type for PDF generation: ${report.type}`);
      }
    }
  } catch (transformError) {
    console.error('[PDF Generator] Failed to transform data:', {
      reportType: report.type,
      error: transformError instanceof Error ? transformError.message : transformError,
      stack: transformError instanceof Error ? transformError.stack : undefined,
    });
    throw new Error(
      `Failed to transform data for PDF: ${transformError instanceof Error ? transformError.message : 'Unknown error'}`
    );
  }

  try {
    console.log('[PDF Generator] Rendering PDF document...');
    // Render to buffer - cast to any to work around typing issue with @react-pdf/renderer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(pdfDocument as any);
    console.log('[PDF Generator] PDF rendered successfully, size:', buffer.length);
    return Buffer.from(buffer);
  } catch (renderError) {
    // Log detailed error for debugging
    console.error('[PDF Generator] renderToBuffer failed:', {
      reportType: report.type,
      projectId: project.id,
      error: renderError instanceof Error ? renderError.message : renderError,
      stack: renderError instanceof Error ? renderError.stack : undefined,
      // Log the transformed data to help debug
      transformedDataKeys: transformedData ? Object.keys(transformedData as object) : [],
    });
    throw new Error(
      `Failed to generate PDF: ${renderError instanceof Error ? renderError.message : 'Unknown error'}`
    );
  }
}

/**
 * Get filename for a report PDF
 */
export function getPDFFilename(projectTitle: string, reportType: ReportType): string {
  const sanitizedTitle = projectTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  const typeLabel = reportType.toLowerCase().replace(/_/g, '-');
  const date = new Date().toISOString().split('T')[0];

  return `ideationlab-${sanitizedTitle}-${typeLabel}-${date}.pdf`;
}

export type { GeneratePDFOptions, ReportType, ReportTier };

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
  const painPoints = research.painPoints as Array<Record<string, unknown>> | null;
  const whyNow = research.whyNow as Record<string, unknown> | null;
  const proofSignals = research.proofSignals as Record<string, unknown> | null;
  const socialProof = research.socialProof as Record<string, unknown> | null;
  const userStory = research.userStory as Record<string, unknown> | null;
  const marketSizing = research.marketSizing as Record<string, unknown> | null;
  const techStack = research.techStack as Record<string, unknown> | null;
  const valueLadder = research.valueLadder as Array<Record<string, unknown>> | null;
  const actionPrompts = research.actionPrompts as Array<Record<string, unknown>> | null;
  const scoreJustifications = research.scoreJustifications as Record<string, unknown> | null;
  const revenuePotential = research.revenuePotential as Record<string, unknown> | null;
  const executionDifficulty = research.executionDifficulty as Record<string, unknown> | null;
  const gtmClarity = research.gtmClarity as Record<string, unknown> | null;
  const founderFit = research.founderFit as Record<string, unknown> | null;
  const synthesizedInsights = research.synthesizedInsights as Record<string, unknown> | null;
  const sparkResult = research.sparkResult as Record<string, unknown> | null;
  const keywordTrends = research.keywordTrends as Array<Record<string, unknown>> | null;

  // Build executive summary from synthesized insights or spark result
  const execSummary = (content.executiveSummary as string)
    || (synthesizedInsights?.summary as string)
    || (sparkResult?.summary as string)
    || (content.rawContent as string)
    || idea.description;

  // Build problem statement from pain points
  const problemFromPainPoints = painPoints?.length
    ? painPoints.slice(0, 3).map((p) => (p.problem as string) || (p.title as string) || (p.description as string)).filter(Boolean).join('. ')
    : undefined;

  return {
    ideaTitle: idea.title,
    ideaDescription: idea.description,
    generatedAt: new Date(),
    tier: report.tier,

    executiveSummary: execSummary,
    problemStatement: (content.problem as string) || problemFromPainPoints || (positioning?.problemStatement as string),
    solution: (content.solution as string) || (positioning?.solution as string),
    uniqueValueProposition: (content.uvp as string) || (positioning?.uvp as string) || (positioning?.statement as string),

    targetMarket: (marketAnalysis?.targetMarket as string) || (content.targetMarket as string),
    marketSize: (marketAnalysis?.marketSize as string) || (content.marketSize as string),
    marketTrends: (marketAnalysis?.trends as string[]) || (content.trends as string[]),

    competitors: competitors?.slice(0, 4).map((c) => ({
      name: (c.name as string) || 'Unknown',
      strengths: (c.strengths as string) || (Array.isArray(c.strengths) ? (c.strengths as string[]).join('. ') : 'N/A'),
      weaknesses: (c.weaknesses as string) || (Array.isArray(c.weaknesses) ? (c.weaknesses as string[]).join('. ') : 'N/A'),
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

    // New fields from research
    scoreJustifications: scoreJustifications ? {
      opportunity: scoreJustifications.opportunity as { score: number; justification: string; confidence: string } | undefined,
      problem: scoreJustifications.problem as { score: number; justification: string; confidence: string } | undefined,
      feasibility: scoreJustifications.feasibility as { score: number; justification: string; confidence: string } | undefined,
      whyNow: scoreJustifications.whyNow as { score: number; justification: string; confidence: string } | undefined,
    } : undefined,

    userStory: userStory ? {
      scenario: userStory.scenario as string,
      protagonist: userStory.protagonist as string,
      problem: userStory.problem as string,
      solution: userStory.solution as string,
      outcome: userStory.outcome as string,
    } : undefined,

    marketSizing: marketSizing ? {
      tam: marketSizing.tam as { value: number; formattedValue: string; growthRate: number; confidence: string; timeframe: string } | undefined,
      sam: marketSizing.sam as { value: number; formattedValue: string; growthRate: number; confidence: string; timeframe: string } | undefined,
      som: marketSizing.som as { value: number; formattedValue: string; growthRate: number; confidence: string; timeframe: string } | undefined,
      methodology: marketSizing.methodology as string | undefined,
    } : undefined,

    whyNow: whyNow ? {
      marketTriggers: (whyNow.marketTriggers as Array<Record<string, unknown>> | string[]) || [],
      technologyShifts: (whyNow.technologyShifts as string[]) || [],
      regulatoryChanges: (whyNow.regulatoryChanges as string[]) || [],
      consumerBehaviorTrends: (whyNow.consumerBehaviorTrends as string[]) || [],
      urgencyScore: whyNow.urgencyScore as number | undefined,
      summary: whyNow.summary as string | undefined,
    } : undefined,

    proofSignals: proofSignals ? {
      demandIndicators: (proofSignals.demandIndicators as string[]) || (proofSignals.marketValidation as string[]) || [],
      validationOpportunities: (proofSignals.validationOpportunities as string[]) || [],
      riskFactors: (proofSignals.riskFactors as string[]) || [],
      demandScore: proofSignals.demandScore as number | undefined,
      summary: proofSignals.summary as string | undefined,
    } : undefined,

    socialProof: socialProof ? {
      posts: (socialProof.posts as Array<Record<string, unknown>>) || [],
      summary: socialProof.summary as string | undefined,
      painPointsValidated: (socialProof.painPointsValidated as string[]) || [],
      demandSignals: (socialProof.demandSignals as string[]) || [],
    } : undefined,

    painPoints: painPoints?.map((p) => ({
      problem: (p.problem as string) || (p.title as string) || '',
      severity: (p.severity as string) || 'medium',
      currentSolutions: (p.currentSolutions as string[]) || [],
      gaps: (p.gaps as string[]) || (p.affectedSegments as string[]) || [],
      description: p.description as string | undefined,
    })),

    businessFit: (revenuePotential || executionDifficulty || gtmClarity || founderFit) ? {
      revenuePotential: revenuePotential ? {
        rating: revenuePotential.rating as string,
        estimate: revenuePotential.estimate as string,
        confidence: revenuePotential.confidence as number,
      } : undefined,
      executionDifficulty: executionDifficulty ? {
        rating: executionDifficulty.rating as string,
        factors: (executionDifficulty.factors as string[]) || [],
        soloFriendly: executionDifficulty.soloFriendly as boolean,
      } : undefined,
      gtmClarity: gtmClarity ? {
        rating: gtmClarity.rating as string,
        channels: (gtmClarity.channels as string[]) || [],
        confidence: gtmClarity.confidence as number,
      } : undefined,
      founderFit: founderFit ? {
        percentage: founderFit.percentage as number,
        strengths: (founderFit.strengths as string[]) || [],
        gaps: (founderFit.gaps as string[]) || [],
      } : undefined,
    } : undefined,

    techStack: techStack ? {
      businessType: techStack.businessType as string,
      layers: techStack.layers as Record<string, Array<Record<string, unknown>>> | undefined,
      estimatedMonthlyCost: techStack.estimatedMonthlyCost as { min: number; max: number } | undefined,
      summary: techStack.summary as string | undefined,
      securityConsiderations: (techStack.securityConsiderations as string[]) || [],
    } : undefined,

    valueLadder: valueLadder?.map((v) => ({
      tier: (v.tier as string) || '',
      label: (v.label as string) || '',
      title: (v.title as string) || (v.name as string) || '',
      price: (v.price as string) || '',
      description: (v.description as string) || '',
      features: (v.features as string[]) || [],
    })),

    actionPrompts: actionPrompts?.map((a) => ({
      title: (a.title as string) || '',
      description: (a.description as string) || '',
      category: (a.category as string) || '',
    })),

    keywordTrends: keywordTrends?.slice(0, 10).map((k) => ({
      keyword: (k.keyword as string) || '',
      volume: (k.volume as number) || 0,
      growth: (k.growth as number) || 0,
    })),
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

  console.log('[PDF Generator] Starting PDF generation:', {
    ideaId: idea.id,
    ideaTitle: idea.title?.slice(0, 50),
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
        transformedData = transformBusinessPlanData(idea, report, parsedResearch);
        console.log('[PDF Generator] Business plan data transformed');
        pdfDocument = <BusinessPlanPDF data={transformedData as Parameters<typeof BusinessPlanPDF>[0]['data']} />;
        break;
      }

      case 'POSITIONING': {
        transformedData = transformPositioningData(idea, report, parsedResearch);
        console.log('[PDF Generator] Positioning data transformed');
        pdfDocument = <PositioningPDF data={transformedData as Parameters<typeof PositioningPDF>[0]['data']} />;
        break;
      }

      case 'COMPETITIVE_ANALYSIS': {
        transformedData = transformCompetitiveAnalysisData(idea, report, parsedResearch);
        console.log('[PDF Generator] Competitive analysis data transformed');
        pdfDocument = <CompetitiveAnalysisPDF data={transformedData as Parameters<typeof CompetitiveAnalysisPDF>[0]['data']} />;
        break;
      }

      // For unsupported report types, generate a basic PDF
      default: {
        transformedData = transformBusinessPlanData(idea, report, parsedResearch);
        console.log('[PDF Generator] Default (business plan) data transformed');
        pdfDocument = <BusinessPlanPDF data={{ ...(transformedData as Parameters<typeof BusinessPlanPDF>[0]['data']), tier: 'BASIC' }} />;
        break;
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
      ideaId: idea.id,
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

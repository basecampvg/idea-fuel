/**
 * Expand Research Pipeline
 *
 * 4-module research pipeline for Expand Mode projects:
 *   Module 1: Adjacency Scan — identifies adjacent market opportunities
 *   Module 2: Competitor Portfolio — maps competitor product lines and gaps
 *   Module 3: Demand Mining — identifies unmet customer demand signals
 *   Module 4: Pricing Ceiling — pricing power analysis (depends on Modules 1 & 2)
 *
 * After all modules complete, a synthesis step extracts opportunity-oriented
 * artifacts for the downstream Opportunity Engine (Phase 5).
 */

import { z } from 'zod';
import { getExtractionProvider, getResearchProvider } from '../providers';
import type { SubscriptionTier } from '../db/schema';
import type {
  ExpandResearchInput,
  BusinessContext,
  ClassificationResult,
  ExpandDataPoints,
  AdjacencyScanResult,
  CompetitorPortfolioResult,
  DemandMiningResult,
  PricingCeilingResult,
  ExpandResearchModuleOutputs,
  ExpandResearchSynthesis,
  ExpandResearchPhase,
} from '@forge/shared';

// ============================================================================
// Zod Schemas for Structured Extraction
// ============================================================================

const adjacencyItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  adjacencyType: z.enum(['customer', 'capability', 'channel', 'product', 'geographic']),
  relevanceScore: z.number().min(0).max(100),
  evidence: z.array(z.string()),
  estimatedEffort: z.enum(['low', 'medium', 'high']),
  marketSignals: z.array(z.string()),
});

const adjacencyScanSchema = z.object({
  adjacencies: z.array(adjacencyItemSchema),
  summary: z.string(),
  totalIdentified: z.number(),
});

const competitorPortfolioSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    productLines: z.array(z.string()),
    recentExpansions: z.array(z.string()),
    gaps: z.array(z.string()),
    marketPosition: z.string(),
    estimatedRevenue: z.string().optional(),
  })),
  whiteSpaces: z.array(z.object({
    description: z.string(),
    competitorCount: z.number(),
    demandEvidence: z.array(z.string()),
  })),
  summary: z.string(),
});

const demandMiningSchema = z.object({
  demandSignals: z.array(z.object({
    signal: z.string(),
    source: z.string(),
    strength: z.enum(['strong', 'moderate', 'weak']),
    customerSegment: z.string(),
    frequency: z.string(),
    relatedProducts: z.array(z.string()),
  })),
  underservedSegments: z.array(z.object({
    segment: z.string(),
    painPoints: z.array(z.string()),
    willingness: z.string(),
    evidence: z.array(z.string()),
  })),
  summary: z.string(),
});

const pricingCeilingSchema = z.object({
  pricingBenchmarks: z.array(z.object({
    productCategory: z.string(),
    lowEnd: z.number(),
    midRange: z.number(),
    highEnd: z.number(),
    currency: z.string(),
    basis: z.string(),
  })),
  pricingPower: z.object({
    currentPosition: z.string(),
    headroom: z.string(),
    factors: z.array(z.string()),
    risks: z.array(z.string()),
  }),
  revenueProjections: z.array(z.object({
    scenario: z.string(),
    annualRevenue: z.string(),
    assumptions: z.array(z.string()),
    confidence: z.enum(['high', 'medium', 'low']),
  })),
  summary: z.string(),
});

const synthesisSchema = z.object({
  topOpportunities: z.array(z.object({
    title: z.string(),
    description: z.string(),
    sources: z.array(z.string()),
    strengthOfEvidence: z.enum(['strong', 'moderate', 'weak']),
  })),
  competitiveLandscape: z.string(),
  demandSummary: z.string(),
  pricingSummary: z.string(),
  dataGaps: z.array(z.string()),
});

// ============================================================================
// Prompt Helpers
// ============================================================================

function formatBusinessContext(ctx: BusinessContext): string {
  const lines = [
    ctx.businessName ? `Business: ${ctx.businessName}` : null,
    `Industry: ${ctx.industryVertical}`,
    `Years in Operation: ${ctx.yearsInOperation}`,
    `Revenue Range: ${ctx.revenueRange}`,
    `Customer Type: ${ctx.customerType}`,
    `Products/Services: ${ctx.currentProducts.join(', ')}`,
    `Geographic Focus: ${ctx.geographicFocus}`,
    `Team Size: ${ctx.teamSize}`,
  ];
  return lines.filter(Boolean).join('\n');
}

function formatInterviewData(data: Partial<ExpandDataPoints>): string {
  const entries = Object.entries(data)
    .filter(([_, v]) => v && v.value != null)
    .map(([k, v]) => `- ${k}: ${v!.value}`);
  return entries.length > 0 ? entries.join('\n') : '(no interview data available)';
}

function formatClassification(c: ClassificationResult): string {
  return `Taxonomy: ${c.taxonomy}\nResearch Modules: ${Object.entries(c.researchModuleConfig).filter(([_, v]) => v).map(([k]) => k).join(', ')}`;
}

// ============================================================================
// Module 1: Adjacency Scan
// ============================================================================

function buildAdjacencyScanPrompt(input: ExpandResearchInput): string {
  return `You are a strategic business analyst specializing in adjacent market expansion for established businesses.

## Business Context
${formatBusinessContext(input.businessContext)}

## Classification
${formatClassification(input.classification)}

## Interview Data (structured insights from founder)
${formatInterviewData(input.expandInterviewData)}

## Task
Identify 5-8 adjacent market opportunities for this business. For each adjacency, consider:
- Can they leverage existing customers, capabilities, channels, products, or geographic presence?
- What evidence supports this opportunity (market trends, customer requests, competitor moves)?
- How much effort would it take to enter this adjacency?

Focus on realistic, actionable adjacencies that build on the business's existing strengths. Rank by relevance score (0-100).

Respond with a JSON object matching this schema:
- adjacencies: array of {id, title, description, adjacencyType (customer|capability|channel|product|geographic), relevanceScore, evidence[], estimatedEffort (low|medium|high), marketSignals[]}
- summary: one paragraph overview
- totalIdentified: total count`;
}

async function runAdjacencyScan(
  input: ExpandResearchInput,
  tier: SubscriptionTier,
): Promise<AdjacencyScanResult> {
  const provider = getExtractionProvider(tier);
  const prompt = buildAdjacencyScanPrompt(input);
  return provider.extract(prompt, adjacencyScanSchema, {
    maxTokens: 4000,
    temperature: 0.4,
    task: 'extraction',
  });
}

// ============================================================================
// Module 2: Competitor Portfolio Tracker
// ============================================================================

function buildCompetitorPortfolioPrompt(input: ExpandResearchInput): string {
  return `You are a competitive intelligence analyst researching product portfolio expansion opportunities.

## Business Context
${formatBusinessContext(input.businessContext)}

## Classification
${formatClassification(input.classification)}

## Interview Data (structured insights from founder)
${formatInterviewData(input.expandInterviewData)}

## Task
Map the competitive landscape for this business's industry and adjacent markets:

1. Identify 3-6 key competitors (direct and adjacent)
2. For each competitor, list their product lines, recent expansions, and gaps in their offerings
3. Identify white spaces — areas where few or no competitors are active but demand exists

Focus on actionable competitive intelligence. Highlight where this business could differentiate or exploit gaps.

Respond with a JSON object:
- competitors: array of {name, productLines[], recentExpansions[], gaps[], marketPosition, estimatedRevenue?}
- whiteSpaces: array of {description, competitorCount, demandEvidence[]}
- summary: one paragraph overview`;
}

async function runCompetitorPortfolio(
  input: ExpandResearchInput,
  tier: SubscriptionTier,
): Promise<CompetitorPortfolioResult> {
  const provider = getExtractionProvider(tier);
  const prompt = buildCompetitorPortfolioPrompt(input);
  return provider.extract(prompt, competitorPortfolioSchema, {
    maxTokens: 4000,
    temperature: 0.4,
    task: 'extraction',
  });
}

// ============================================================================
// Module 3: Customer Demand Mining
// ============================================================================

function buildDemandMiningPrompt(input: ExpandResearchInput): string {
  return `You are a customer research analyst specializing in demand signal detection for existing businesses exploring expansion.

## Business Context
${formatBusinessContext(input.businessContext)}

## Classification
${formatClassification(input.classification)}

## Interview Data (structured insights from founder)
${formatInterviewData(input.expandInterviewData)}

## Task
Mine for unmet customer demand signals relevant to this business's expansion:

1. Identify 5-10 demand signals — explicit or implicit customer requests, complaints, workarounds, or unmet needs that signal opportunity
2. For each signal, assess strength (strong/moderate/weak), identify the customer segment, and link to potential products/services
3. Identify 2-4 underserved customer segments the business could better serve with new offerings

Base your analysis on the business context and interview data. Focus on demand that this specific business is well-positioned to serve.

Respond with a JSON object:
- demandSignals: array of {signal, source, strength (strong|moderate|weak), customerSegment, frequency, relatedProducts[]}
- underservedSegments: array of {segment, painPoints[], willingness, evidence[]}
- summary: one paragraph overview`;
}

async function runDemandMining(
  input: ExpandResearchInput,
  tier: SubscriptionTier,
): Promise<DemandMiningResult> {
  const provider = getExtractionProvider(tier);
  const prompt = buildDemandMiningPrompt(input);
  return provider.extract(prompt, demandMiningSchema, {
    maxTokens: 4000,
    temperature: 0.4,
    task: 'extraction',
  });
}

// ============================================================================
// Module 4: Pricing Ceiling Analysis (depends on Modules 1 & 2)
// ============================================================================

function buildPricingCeilingPrompt(
  input: ExpandResearchInput,
  adjacencyData: AdjacencyScanResult | null,
  competitorData: CompetitorPortfolioResult | null,
): string {
  const adjacencyContext = adjacencyData
    ? `\n## Adjacency Scan Results\nTop adjacencies: ${adjacencyData.adjacencies.slice(0, 5).map(a => `${a.title} (${a.adjacencyType}, relevance: ${a.relevanceScore})`).join('; ')}\nSummary: ${adjacencyData.summary}`
    : '';

  const competitorContext = competitorData
    ? `\n## Competitor Portfolio Results\nCompetitors: ${competitorData.competitors.map(c => `${c.name} (${c.productLines.length} products)`).join('; ')}\nWhite spaces: ${competitorData.whiteSpaces.map(w => w.description).join('; ')}\nSummary: ${competitorData.summary}`
    : '';

  return `You are a pricing strategist analyzing expansion pricing power for an established business.

## Business Context
${formatBusinessContext(input.businessContext)}

## Classification
${formatClassification(input.classification)}

## Interview Data (structured insights from founder)
${formatInterviewData(input.expandInterviewData)}
${adjacencyContext}
${competitorContext}

## Task
Analyze pricing power and revenue potential for this business's expansion opportunities:

1. Provide pricing benchmarks for 3-5 relevant product/service categories the business could expand into
2. Assess current pricing position and headroom (can they charge more? what factors help or hurt?)
3. Project revenue under 3 scenarios (conservative, moderate, aggressive) with assumptions and confidence levels

Use the adjacency scan and competitor data to ground your analysis. Focus on realistic projections.

Respond with a JSON object:
- pricingBenchmarks: array of {productCategory, lowEnd, midRange, highEnd, currency, basis}
- pricingPower: {currentPosition, headroom, factors[], risks[]}
- revenueProjections: array of {scenario, annualRevenue, assumptions[], confidence (high|medium|low)}
- summary: one paragraph overview`;
}

async function runPricingCeiling(
  input: ExpandResearchInput,
  tier: SubscriptionTier,
  adjacencyData: AdjacencyScanResult | null,
  competitorData: CompetitorPortfolioResult | null,
): Promise<PricingCeilingResult> {
  const provider = getExtractionProvider(tier);
  const prompt = buildPricingCeilingPrompt(input, adjacencyData, competitorData);
  return provider.extract(prompt, pricingCeilingSchema, {
    maxTokens: 4000,
    temperature: 0.3,
    task: 'extraction',
  });
}

// ============================================================================
// Synthesis: Combine module outputs into opportunity-oriented artifacts
// ============================================================================

function buildSynthesisPrompt(
  input: ExpandResearchInput,
  modules: ExpandResearchModuleOutputs,
): string {
  const sections: string[] = [];

  if (modules.adjacencyScan) {
    sections.push(`## Adjacency Scan\n${modules.adjacencyScan.summary}\nTop adjacencies: ${modules.adjacencyScan.adjacencies.slice(0, 5).map(a => `- ${a.title}: ${a.description}`).join('\n')}`);
  }
  if (modules.competitorPortfolio) {
    sections.push(`## Competitor Portfolio\n${modules.competitorPortfolio.summary}\nWhite spaces: ${modules.competitorPortfolio.whiteSpaces.map(w => `- ${w.description}`).join('\n')}`);
  }
  if (modules.demandMining) {
    sections.push(`## Demand Mining\n${modules.demandMining.summary}\nTop signals: ${modules.demandMining.demandSignals.slice(0, 5).map(d => `- ${d.signal} (${d.strength})`).join('\n')}`);
  }
  if (modules.pricingCeiling) {
    sections.push(`## Pricing Ceiling\n${modules.pricingCeiling.summary}\nPricing power: ${modules.pricingCeiling.pricingPower.currentPosition}`);
  }

  return `You are a strategic synthesis analyst combining multiple research modules into actionable expansion insights.

## Business Context
${formatBusinessContext(input.businessContext)}

## Research Module Outputs
${sections.join('\n\n')}

## Task
Synthesize all research module outputs into a unified expansion intelligence brief:

1. Identify the top 3-7 expansion opportunities, ranked by strength of evidence. Each opportunity should draw from multiple modules.
2. Summarize the competitive landscape in one paragraph.
3. Summarize customer demand patterns in one paragraph.
4. Summarize pricing and revenue potential in one paragraph.
5. List any data gaps that would improve the analysis if filled.

Respond with a JSON object:
- topOpportunities: array of {title, description, sources[] (which modules contributed), strengthOfEvidence (strong|moderate|weak)}
- competitiveLandscape: string (one paragraph)
- demandSummary: string (one paragraph)
- pricingSummary: string (one paragraph)
- dataGaps: string[] (list of missing data that would improve analysis)`;
}

async function runSynthesis(
  input: ExpandResearchInput,
  modules: ExpandResearchModuleOutputs,
  tier: SubscriptionTier,
): Promise<ExpandResearchSynthesis> {
  const provider = getExtractionProvider(tier);
  const prompt = buildSynthesisPrompt(input, modules);
  const result = await provider.extract(prompt, synthesisSchema, {
    maxTokens: 4000,
    temperature: 0.3,
    task: 'extraction',
  });
  return {
    ...result,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Pipeline Orchestrator
// ============================================================================

export interface ExpandResearchProgress {
  phase: ExpandResearchPhase;
  progress: number;
  moduleOutputs: ExpandResearchModuleOutputs;
  synthesis: ExpandResearchSynthesis | null;
}

export type ExpandProgressCallback = (
  phase: ExpandResearchPhase,
  progress: number,
  data?: Partial<ExpandResearchProgress>,
) => Promise<void>;

/**
 * Run the full Expand research pipeline.
 *
 * Execution order:
 *   1. Modules 1-3 run in parallel (Adjacency, Competitor, Demand)
 *   2. Module 4 (Pricing Ceiling) runs after 1 & 2 complete (uses their output)
 *   3. Synthesis runs after all modules complete
 */
export async function runExpandResearchPipeline(
  input: ExpandResearchInput,
  tier: SubscriptionTier = 'ENTERPRISE',
  onProgress?: ExpandProgressCallback,
): Promise<{
  moduleOutputs: ExpandResearchModuleOutputs;
  synthesis: ExpandResearchSynthesis;
}> {
  const moduleOutputs: ExpandResearchModuleOutputs = {
    adjacencyScan: null,
    competitorPortfolio: null,
    demandMining: null,
    pricingCeiling: null,
  };

  const enabled = input.classification.researchModuleConfig;

  // Phase 1-3: Run Adjacency, Competitor, and Demand in parallel
  await onProgress?.('ADJACENCY_SCAN', 5);

  const parallelModules = await Promise.allSettled([
    enabled.adjacencyScan
      ? runAdjacencyScan(input, tier)
      : Promise.resolve(null),
    enabled.competitorPortfolio
      ? runCompetitorPortfolio(input, tier)
      : Promise.resolve(null),
    enabled.demandMining
      ? runDemandMining(input, tier)
      : Promise.resolve(null),
  ]);

  // Extract results, log failures but don't abort
  if (parallelModules[0].status === 'fulfilled') {
    moduleOutputs.adjacencyScan = parallelModules[0].value;
  } else {
    console.error('[ExpandResearch] Adjacency Scan failed:', parallelModules[0].reason);
  }
  await onProgress?.('COMPETITOR_PORTFOLIO', 25);

  if (parallelModules[1].status === 'fulfilled') {
    moduleOutputs.competitorPortfolio = parallelModules[1].value;
  } else {
    console.error('[ExpandResearch] Competitor Portfolio failed:', parallelModules[1].reason);
  }
  await onProgress?.('DEMAND_MINING', 45);

  if (parallelModules[2].status === 'fulfilled') {
    moduleOutputs.demandMining = parallelModules[2].value;
  } else {
    console.error('[ExpandResearch] Demand Mining failed:', parallelModules[2].reason);
  }
  await onProgress?.('PRICING_CEILING', 60);

  // Phase 4: Pricing Ceiling (depends on Adjacency & Competitor results)
  if (enabled.pricingCeiling) {
    try {
      moduleOutputs.pricingCeiling = await runPricingCeiling(
        input,
        tier,
        moduleOutputs.adjacencyScan,
        moduleOutputs.competitorPortfolio,
      );
    } catch (error) {
      console.error('[ExpandResearch] Pricing Ceiling failed:', error);
    }
  }
  await onProgress?.('SYNTHESIS', 80);

  // Check that we have at least some data to synthesize
  const moduleCount = Object.values(moduleOutputs).filter(Boolean).length;
  if (moduleCount === 0) {
    throw new Error('All research modules failed — no data to synthesize');
  }

  // Phase 5: Synthesis
  const synthesis = await runSynthesis(input, moduleOutputs, tier);

  await onProgress?.('COMPLETE', 100, { moduleOutputs, synthesis });

  return { moduleOutputs, synthesis };
}

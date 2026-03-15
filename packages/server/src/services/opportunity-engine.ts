/**
 * Opportunity Engine
 *
 * Two-phase engine that scores and ranks expansion opportunities:
 *
 *   Phase 1 — Moat Audit (once per project)
 *     Evaluates 5 moat asset types: customer captivity, inherited distribution,
 *     proprietary assets, cost advantage, network effects.
 *
 *   Phase 2 — Opportunity Scoring (per opportunity)
 *     Generates 3-5 expansion opportunities from research, scores each on
 *     5 dimensions (operational fit, revenue potential, resource requirement,
 *     strategic risk, MOAT strength), applies MOAT inheritance scoring,
 *     ranks and tiers as Pursue / Explore / Defer, and generates a
 *     one-sentence MOAT verdict per opportunity.
 */

import { z } from 'zod';
import { getExtractionProvider } from '../providers';
import type { SubscriptionTier } from '../db/schema';
import type {
  BusinessContext,
  ClassificationResult,
  ExpandDataPoints,
  ExpandResearchModuleOutputs,
  ExpandResearchSynthesis,
  MoatAuditResult,
  MoatAssetType,
  OpportunityEngineResult,
  ScoredOpportunity,
} from '@forge/shared';

// ============================================================================
// Zod Schemas
// ============================================================================

const moatAssetTypeSchema = z.string().transform((val) => {
  // AI sometimes returns Title Case instead of kebab-case — normalize
  const normalized = val.toLowerCase().replace(/\s+/g, '-');
  const valid = ['customer-captivity', 'inherited-distribution', 'proprietary-assets', 'cost-advantage', 'network-effects'] as const;
  if (valid.includes(normalized as typeof valid[number])) return normalized as MoatAssetType;
  return 'customer-captivity' as MoatAssetType; // fallback
});

const moatAuditSchema = z.object({
  assets: z.array(z.object({
    type: moatAssetTypeSchema,
    score: z.number().min(0).max(100),
    evidence: z.array(z.string()),
    transferability: z.string(),
  })),
  overallMoatStrength: z.number().min(0).max(100),
  summary: z.string(),
});

const opportunityGenerationSchema = z.object({
  opportunities: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    evidenceTrail: z.array(z.string()),
    confidence: z.string().transform((v) => v.toLowerCase() as 'high' | 'medium' | 'low'),
  })),
});

const opportunityScoringSchema = z.object({
  operationalFit: z.number().min(0).max(100),
  revenuePotential: z.number().min(0).max(100),
  resourceRequirement: z.number().min(0).max(100),
  strategicRisk: z.number().min(0).max(100),
  moatStrength: z.number().min(0).max(100),
  moatVerdict: z.string(),
});

// ============================================================================
// Prompt Helpers
// ============================================================================

function formatBusinessContextBrief(ctx: BusinessContext): string {
  const lines = [
    ctx.businessName ? `Business: ${ctx.businessName}` : null,
    `Industry: ${ctx.industryVertical}`,
    `Revenue: ${ctx.revenueRange}`,
    `Customer Type: ${ctx.customerType}`,
    `Products: ${ctx.currentProducts.join(', ')}`,
    `Team: ${ctx.teamSize}`,
    `Geography: ${ctx.geographicFocus}`,
  ];
  return lines.filter(Boolean).join('\n');
}

function formatSynthesis(s: ExpandResearchSynthesis): string {
  const opps = s.topOpportunities
    .map((o, i) => `${i + 1}. ${o.title}: ${o.description} (evidence: ${o.strengthOfEvidence})`)
    .join('\n');
  return `## Top Opportunities\n${opps}\n\n## Competitive Landscape\n${s.competitiveLandscape}\n\n## Demand Summary\n${s.demandSummary}\n\n## Pricing Summary\n${s.pricingSummary}`;
}

function formatModuleHighlights(modules: ExpandResearchModuleOutputs): string {
  const sections: string[] = [];

  if (modules.adjacencyScan) {
    const top = modules.adjacencyScan.adjacencies.slice(0, 3).map(a => `- ${a.title} (${a.adjacencyType}, relevance: ${a.relevanceScore})`).join('\n');
    sections.push(`### Adjacency Scan\n${top}`);
  }
  if (modules.competitorPortfolio) {
    const gaps = modules.competitorPortfolio.whiteSpaces.map(w => `- ${w.description}`).join('\n');
    sections.push(`### White Spaces\n${gaps}`);
  }
  if (modules.demandMining) {
    const signals = modules.demandMining.demandSignals.filter(d => d.strength === 'strong').slice(0, 3).map(d => `- ${d.signal}`).join('\n');
    sections.push(`### Strong Demand Signals\n${signals || '(none identified)'}`);
  }
  if (modules.pricingCeiling) {
    sections.push(`### Pricing Power\n${modules.pricingCeiling.pricingPower.currentPosition}\nHeadroom: ${modules.pricingCeiling.pricingPower.headroom}`);
  }

  return sections.join('\n\n');
}

function formatMoatAudit(audit: MoatAuditResult): string {
  const assets = audit.assets
    .map(a => `- ${a.type}: ${a.score}/100 — transferability: ${a.transferability}`)
    .join('\n');
  return `## MOAT Audit (strength: ${audit.overallMoatStrength}/100)\n${assets}\n${audit.summary}`;
}

// ============================================================================
// Phase 1: Moat Audit
// ============================================================================

function buildMoatAuditPrompt(
  businessContext: BusinessContext,
  interviewData: Partial<ExpandDataPoints>,
  modules: ExpandResearchModuleOutputs,
): string {
  const interviewEntries = Object.entries(interviewData)
    .filter(([_, v]) => v && v.value != null)
    .map(([k, v]) => `- ${k}: ${v!.value}`)
    .join('\n');

  return `You are a strategic moat analyst evaluating an existing business's competitive advantages.

## Business Context
${formatBusinessContextBrief(businessContext)}

## Founder Interview Data
${interviewEntries || '(limited data)'}

## Research Highlights
${formatModuleHighlights(modules)}

## Task
Evaluate this business's moat across 5 asset types. For each, score 0-100 and explain:

1. **Customer Captivity** — How locked-in are customers? Switching costs, contracts, habits, data lock-in.
2. **Inherited Distribution** — What distribution channels would a new product automatically inherit? Existing customer base, referral networks, partnerships.
3. **Proprietary Assets** — IP, proprietary data, unique processes, brand equity, trade secrets.
4. **Cost Advantage** — Economies of scale, operational efficiency, supplier relationships.
5. **Network Effects** — Does the product get better as more people use it? Marketplace dynamics, community effects.

For each asset, also assess **transferability**: how well this moat asset could transfer to a new product line.

Respond with a JSON object:
- assets: array of {type, score (0-100), evidence[], transferability}
- overallMoatStrength: weighted average (0-100)
- summary: one paragraph synthesis of the business's moat position`;
}

async function runMoatAudit(
  businessContext: BusinessContext,
  interviewData: Partial<ExpandDataPoints>,
  modules: ExpandResearchModuleOutputs,
  tier: SubscriptionTier,
): Promise<MoatAuditResult> {
  const provider = getExtractionProvider(tier);
  const prompt = buildMoatAuditPrompt(businessContext, interviewData, modules);
  const result = await provider.extract(prompt, moatAuditSchema, {
    maxTokens: 3000,
    temperature: 0.3,
    task: 'extraction',
  });
  return {
    ...result,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Phase 2a: Opportunity Generation
// ============================================================================

function buildOpportunityGenerationPrompt(
  businessContext: BusinessContext,
  synthesis: ExpandResearchSynthesis,
  modules: ExpandResearchModuleOutputs,
  moatAudit: MoatAuditResult,
): string {
  return `You are a strategic expansion advisor identifying the most promising growth opportunities for an established business.

## Business Context
${formatBusinessContextBrief(businessContext)}

## Research Synthesis
${formatSynthesis(synthesis)}

## Research Module Highlights
${formatModuleHighlights(modules)}

## MOAT Audit
${formatMoatAudit(moatAudit)}

## Task
Based on all research data and the business's moat profile, identify 3-5 concrete expansion opportunities. Each should be:
- Specific enough to evaluate (not "expand to new markets" but "launch premium consulting tier for enterprise clients")
- Grounded in research evidence (cite which modules support it)
- Feasible for this business given their team size, revenue, and capabilities

For each opportunity, provide:
- id: unique identifier (e.g., "opp-1")
- title: concise name
- description: 2-3 sentence explanation
- evidenceTrail: array of strings citing specific research findings
- confidence: high/medium/low based on evidence strength

Respond with a JSON object:
- opportunities: array of {id, title, description, evidenceTrail[], confidence}`;
}

interface GeneratedOpportunity {
  id: string;
  title: string;
  description: string;
  evidenceTrail: string[];
  confidence: 'high' | 'medium' | 'low';
}

async function generateOpportunities(
  businessContext: BusinessContext,
  synthesis: ExpandResearchSynthesis,
  modules: ExpandResearchModuleOutputs,
  moatAudit: MoatAuditResult,
  tier: SubscriptionTier,
): Promise<GeneratedOpportunity[]> {
  const provider = getExtractionProvider(tier);
  const prompt = buildOpportunityGenerationPrompt(businessContext, synthesis, modules, moatAudit);
  const result = await provider.extract(prompt, opportunityGenerationSchema, {
    maxTokens: 3000,
    temperature: 0.4,
    task: 'extraction',
  });
  return result.opportunities;
}

// ============================================================================
// Phase 2b: Opportunity Scoring (per opportunity, with MOAT inheritance)
// ============================================================================

function buildOpportunityScoringPrompt(
  opportunity: GeneratedOpportunity,
  businessContext: BusinessContext,
  moatAudit: MoatAuditResult,
  modules: ExpandResearchModuleOutputs,
): string {
  return `You are a strategic scoring analyst evaluating a specific expansion opportunity for an established business.

## Business Context
${formatBusinessContextBrief(businessContext)}

## MOAT Audit
${formatMoatAudit(moatAudit)}

## Opportunity to Score
**${opportunity.title}**
${opportunity.description}

Evidence: ${opportunity.evidenceTrail.join('; ')}

## Research Context
${formatModuleHighlights(modules)}

## Task
Score this opportunity on 5 dimensions (0-100 each):

1. **Operational Fit** (0-100) — How well does this fit the business's existing operations, team skills, and infrastructure? High = easy to execute with current capabilities.

2. **Revenue Potential** (0-100) — How much revenue could this generate? Consider market size, pricing power, and realistic capture rate. High = significant revenue opportunity.

3. **Resource Requirement** (0-100) — How resource-efficient is this? High = low investment needed relative to returns. Low = requires heavy investment.

4. **Strategic Risk** (0-100) — How safe is this strategically? High = low risk of cannibalization, market failure, or competitive response. Low = high risk.

5. **MOAT Strength** (0-100) — How much of the existing business's moat transfers to this opportunity? Consider each moat asset's transferability. High = strong moat inheritance.

Also generate a **moatVerdict**: one sentence summarizing how the business's competitive advantages help or hinder this specific opportunity.

Respond with a JSON object:
- operationalFit: number (0-100)
- revenuePotential: number (0-100)
- resourceRequirement: number (0-100)
- strategicRisk: number (0-100)
- moatStrength: number (0-100)
- moatVerdict: string`;
}

interface OpportunityScores {
  operationalFit: number;
  revenuePotential: number;
  resourceRequirement: number;
  strategicRisk: number;
  moatStrength: number;
  moatVerdict: string;
}

async function scoreOpportunity(
  opportunity: GeneratedOpportunity,
  businessContext: BusinessContext,
  moatAudit: MoatAuditResult,
  modules: ExpandResearchModuleOutputs,
  tier: SubscriptionTier,
): Promise<OpportunityScores> {
  const provider = getExtractionProvider(tier);
  const prompt = buildOpportunityScoringPrompt(opportunity, businessContext, moatAudit, modules);
  return provider.extract(prompt, opportunityScoringSchema, {
    maxTokens: 1500,
    temperature: 0.3,
    task: 'scoring',
  });
}

// ============================================================================
// Ranking & Tiering
// ============================================================================

const DIMENSION_WEIGHTS = {
  operationalFit: 0.20,
  revenuePotential: 0.25,
  resourceRequirement: 0.15,
  strategicRisk: 0.15,
  moatStrength: 0.25,
} as const;

function computeOverallScore(scores: ScoredOpportunity['scores']): number {
  return Math.round(
    scores.operationalFit * DIMENSION_WEIGHTS.operationalFit +
    scores.revenuePotential * DIMENSION_WEIGHTS.revenuePotential +
    scores.resourceRequirement * DIMENSION_WEIGHTS.resourceRequirement +
    scores.strategicRisk * DIMENSION_WEIGHTS.strategicRisk +
    scores.moatStrength * DIMENSION_WEIGHTS.moatStrength
  );
}

function assignTier(overallScore: number): 'Pursue' | 'Explore' | 'Defer' {
  if (overallScore >= 65) return 'Pursue';
  if (overallScore >= 40) return 'Explore';
  return 'Defer';
}

// ============================================================================
// Main Engine Entry Point
// ============================================================================

export interface OpportunityEngineInput {
  businessContext: BusinessContext;
  classification: ClassificationResult;
  expandInterviewData: Partial<ExpandDataPoints>;
  moduleOutputs: ExpandResearchModuleOutputs;
  synthesis: ExpandResearchSynthesis;
}

/**
 * Run the Opportunity Engine.
 *
 * Phase 1: Moat Audit (evaluates business's competitive advantages)
 * Phase 2: Generate opportunities → Score each → Rank & tier → Generate verdicts
 *
 * Returns the complete OpportunityEngineResult + MoatAuditResult for separate storage.
 */
export async function runOpportunityEngine(
  input: OpportunityEngineInput,
  tier: SubscriptionTier = 'ENTERPRISE',
): Promise<{
  engineResult: OpportunityEngineResult;
  moatAudit: MoatAuditResult;
}> {
  const { businessContext, expandInterviewData, moduleOutputs, synthesis } = input;

  // Phase 1: Moat Audit
  console.log('[OpportunityEngine] Running Moat Audit...');
  const moatAudit = await runMoatAudit(businessContext, expandInterviewData, moduleOutputs, tier);
  console.log(`[OpportunityEngine] Moat Audit complete — strength: ${moatAudit.overallMoatStrength}/100`);

  // Phase 2a: Generate opportunities
  console.log('[OpportunityEngine] Generating opportunities...');
  const generatedOpps = await generateOpportunities(businessContext, synthesis, moduleOutputs, moatAudit, tier);
  console.log(`[OpportunityEngine] Generated ${generatedOpps.length} opportunities`);

  // Phase 2b: Score each opportunity in parallel
  console.log('[OpportunityEngine] Scoring opportunities...');
  const scoringResults = await Promise.allSettled(
    generatedOpps.map(opp => scoreOpportunity(opp, businessContext, moatAudit, moduleOutputs, tier))
  );

  // Combine generation + scoring into ScoredOpportunity[]
  const scoredOpportunities: ScoredOpportunity[] = [];
  for (let i = 0; i < generatedOpps.length; i++) {
    const opp = generatedOpps[i];
    const scoringResult = scoringResults[i];

    if (scoringResult.status === 'rejected') {
      console.error(`[OpportunityEngine] Failed to score opportunity "${opp.title}":`, scoringResult.reason);
      // Use neutral scores so the opportunity isn't lost
      const fallbackScores: ScoredOpportunity['scores'] = {
        operationalFit: 50,
        revenuePotential: 50,
        resourceRequirement: 50,
        strategicRisk: 50,
        moatStrength: 50,
      };
      const overallScore = computeOverallScore(fallbackScores);
      scoredOpportunities.push({
        id: opp.id,
        title: opp.title,
        description: opp.description,
        tier: assignTier(overallScore),
        scores: fallbackScores,
        overallScore,
        moatVerdict: 'Scoring unavailable — using neutral estimates.',
        evidenceTrail: opp.evidenceTrail,
        confidence: 'low',
      });
      continue;
    }

    const scores: ScoredOpportunity['scores'] = {
      operationalFit: scoringResult.value.operationalFit,
      revenuePotential: scoringResult.value.revenuePotential,
      resourceRequirement: scoringResult.value.resourceRequirement,
      strategicRisk: scoringResult.value.strategicRisk,
      moatStrength: scoringResult.value.moatStrength,
    };
    const overallScore = computeOverallScore(scores);

    scoredOpportunities.push({
      id: opp.id,
      title: opp.title,
      description: opp.description,
      tier: assignTier(overallScore),
      scores,
      overallScore,
      moatVerdict: scoringResult.value.moatVerdict,
      evidenceTrail: opp.evidenceTrail,
      confidence: opp.confidence,
    });
  }

  // Sort by overall score descending
  scoredOpportunities.sort((a, b) => b.overallScore - a.overallScore);

  // Determine which interview tracks had data
  const interviewKeys = Object.keys(expandInterviewData);
  const trackACounts = interviewKeys.filter(k => k.startsWith('current') || k.startsWith('top') || k.startsWith('product') || k.startsWith('revenue')).length;
  const trackBCounts = interviewKeys.filter(k => k.startsWith('customer') || k.startsWith('icp') || k.startsWith('churn') || k.startsWith('upsell')).length;
  const trackCCounts = interviewKeys.filter(k => k.startsWith('primary') || k.startsWith('risk') || k.startsWith('vision') || k.startsWith('competitive')).length;

  const researchModulesUsed = Object.entries(moduleOutputs)
    .filter(([_, v]) => v !== null)
    .map(([k]) => k);

  const engineResult: OpportunityEngineResult = {
    opportunities: scoredOpportunities,
    moatAuditId: `moat-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    inputSummary: {
      businessContext: `${businessContext.industryVertical} | ${businessContext.revenueRange} | ${businessContext.currentProducts.join(', ')}`,
      interviewCompleteness: {
        trackA: Math.min(trackACounts, 10),
        trackB: Math.min(trackBCounts, 10),
        trackC: Math.min(trackCCounts, 10),
      },
      researchModulesUsed,
    },
  };

  console.log(`[OpportunityEngine] Complete — ${scoredOpportunities.length} opportunities: ${scoredOpportunities.filter(o => o.tier === 'Pursue').length} Pursue, ${scoredOpportunities.filter(o => o.tier === 'Explore').length} Explore, ${scoredOpportunities.filter(o => o.tier === 'Defer').length} Defer`);

  return { engineResult, moatAudit };
}

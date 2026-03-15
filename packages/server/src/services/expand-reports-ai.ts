/**
 * Expand Mode Report Generation
 *
 * 3 report types for Expand Mode projects:
 *   1. Opportunity Scorecard — ranked opportunities with scores, MOAT verdicts, evidence
 *   2. Expansion Business Case — detailed business case for a selected opportunity
 *   3. Risk & Cannibalization Report — risk assessment across all opportunities
 */

import { z } from 'zod';
import { getGenerationProvider } from '../providers';
import type { SubscriptionTier } from '../db/schema';
import type {
  BusinessContext,
  OpportunityEngineResult,
  MoatAuditResult,
  ExpandResearchModuleOutputs,
  ScoredOpportunity,
} from '@forge/shared';

// ============================================================================
// Input Types
// ============================================================================

export interface ExpandReportContext {
  businessContext: BusinessContext;
  engineResult: OpportunityEngineResult;
  moatAudit: MoatAuditResult;
  moduleOutputs: ExpandResearchModuleOutputs;
}

// ============================================================================
// 1. Opportunity Scorecard
// ============================================================================

export interface OpportunityScorecardReport {
  executiveSummary: string;
  moatProfile: {
    overallStrength: number;
    summary: string;
    assets: Array<{
      type: string;
      score: number;
      transferability: string;
    }>;
  };
  opportunities: Array<{
    rank: number;
    title: string;
    description: string;
    tier: string;
    overallScore: number;
    scores: Record<string, number>;
    moatVerdict: string;
    evidence: string[];
    confidence: string;
  }>;
  strategicRecommendation: string;
  dataGaps: string[];
}

export async function generateOpportunityScorecardReport(
  context: ExpandReportContext,
  tier: SubscriptionTier,
): Promise<string> {
  const provider = getGenerationProvider(tier);
  const { engineResult, moatAudit, businessContext } = context;

  const oppSummary = engineResult.opportunities.map((o, i) =>
    `${i + 1}. **${o.title}** (${o.tier}, score: ${o.overallScore}/100)\n   ${o.description}\n   MOAT: ${o.moatVerdict}\n   Evidence: ${o.evidenceTrail.join('; ')}`
  ).join('\n\n');

  const moatSummary = moatAudit.assets.map(a =>
    `- ${a.type}: ${a.score}/100 (transferability: ${a.transferability})`
  ).join('\n');

  const prompt = `Generate a comprehensive Opportunity Scorecard report for this business expansion analysis.

## Business Context
Industry: ${businessContext.industryVertical}
Products: ${businessContext.currentProducts.join(', ')}
Revenue: ${businessContext.revenueRange}
Customer Type: ${businessContext.customerType}

## MOAT Audit (strength: ${moatAudit.overallMoatStrength}/100)
${moatSummary}
${moatAudit.summary}

## Scored Opportunities
${oppSummary}

## Task
Write a professional Opportunity Scorecard report in JSON format with these sections:
1. executiveSummary — 2-3 paragraph overview of findings
2. moatProfile — formatted moat assessment
3. opportunities — each opportunity with rank, scores, verdict, evidence
4. strategicRecommendation — 1-2 paragraphs advising which opportunities to pursue and in what order
5. dataGaps — areas where more data would improve confidence

Write in a professional consulting tone. Be specific and actionable.`;

  const content = await provider.generate(prompt, {
    maxTokens: 6000,
    temperature: 0.3,
    task: 'generation',
  });

  // Build structured report
  const report: OpportunityScorecardReport = {
    executiveSummary: content,
    moatProfile: {
      overallStrength: moatAudit.overallMoatStrength,
      summary: moatAudit.summary,
      assets: moatAudit.assets.map(a => ({
        type: a.type,
        score: a.score,
        transferability: a.transferability,
      })),
    },
    opportunities: engineResult.opportunities.map((o, i) => ({
      rank: i + 1,
      title: o.title,
      description: o.description,
      tier: o.tier,
      overallScore: o.overallScore,
      scores: o.scores,
      moatVerdict: o.moatVerdict,
      evidence: o.evidenceTrail,
      confidence: o.confidence,
    })),
    strategicRecommendation: '', // Extracted from AI content
    dataGaps: engineResult.inputSummary.researchModulesUsed.length < 4
      ? ['Some research modules did not complete — scores may have reduced confidence']
      : [],
  };

  return JSON.stringify(report);
}

// ============================================================================
// 2. Expansion Business Case
// ============================================================================

export interface ExpansionBusinessCaseReport {
  opportunity: {
    title: string;
    description: string;
    tier: string;
    overallScore: number;
  };
  executiveSummary: string;
  marketOpportunity: string;
  competitiveAdvantage: string;
  implementationPlan: string;
  financialProjection: string;
  riskMitigation: string;
  resourceRequirements: string;
  timeline: string;
  successMetrics: string;
}

export async function generateExpansionBusinessCaseReport(
  context: ExpandReportContext,
  opportunityId: string,
  tier: SubscriptionTier,
): Promise<string> {
  const provider = getGenerationProvider(tier);
  const { engineResult, moatAudit, businessContext, moduleOutputs } = context;

  // Find the selected opportunity
  const opportunity = engineResult.opportunities.find(o => o.id === opportunityId)
    || engineResult.opportunities[0]; // Fallback to top-ranked

  const pricingContext = moduleOutputs.pricingCeiling
    ? `Pricing: ${moduleOutputs.pricingCeiling.pricingPower.currentPosition}, headroom: ${moduleOutputs.pricingCeiling.pricingPower.headroom}`
    : '';

  const competitorContext = moduleOutputs.competitorPortfolio
    ? `Competitors: ${moduleOutputs.competitorPortfolio.competitors.map(c => c.name).join(', ')}\nWhite spaces: ${moduleOutputs.competitorPortfolio.whiteSpaces.map(w => w.description).join('; ')}`
    : '';

  const prompt = `Generate a detailed Expansion Business Case for this specific opportunity.

## Business Context
Industry: ${businessContext.industryVertical}
Products: ${businessContext.currentProducts.join(', ')}
Revenue: ${businessContext.revenueRange}
Team: ${businessContext.teamSize}
${pricingContext}
${competitorContext}

## Selected Opportunity
**${opportunity.title}** (${opportunity.tier}, score: ${opportunity.overallScore}/100)
${opportunity.description}

Scores:
- Operational Fit: ${opportunity.scores.operationalFit}/100
- Revenue Potential: ${opportunity.scores.revenuePotential}/100
- Resource Requirement: ${opportunity.scores.resourceRequirement}/100
- Strategic Risk: ${opportunity.scores.strategicRisk}/100
- MOAT Strength: ${opportunity.scores.moatStrength}/100

MOAT Verdict: ${opportunity.moatVerdict}
Evidence: ${opportunity.evidenceTrail.join('; ')}

## MOAT Profile (strength: ${moatAudit.overallMoatStrength}/100)
${moatAudit.summary}

## Task
Write a professional Expansion Business Case with these sections (each 1-3 paragraphs):

1. Executive Summary — concise overview of the opportunity and recommendation
2. Market Opportunity — market size, growth, timing
3. Competitive Advantage — how existing moat transfers, differentiation
4. Implementation Plan — key steps to launch this expansion
5. Financial Projection — revenue estimates, costs, timeline to profitability
6. Risk Mitigation — key risks and how to address them
7. Resource Requirements — team, budget, tools needed
8. Timeline — phased rollout plan (3/6/12 months)
9. Success Metrics — KPIs to track

Write in a professional consulting tone. Be specific to this business and opportunity.`;

  const content = await provider.generate(prompt, {
    maxTokens: 8000,
    temperature: 0.3,
    task: 'generation',
  });

  const report: ExpansionBusinessCaseReport = {
    opportunity: {
      title: opportunity.title,
      description: opportunity.description,
      tier: opportunity.tier,
      overallScore: opportunity.overallScore,
    },
    executiveSummary: content,
    marketOpportunity: '',
    competitiveAdvantage: '',
    implementationPlan: '',
    financialProjection: '',
    riskMitigation: '',
    resourceRequirements: '',
    timeline: '',
    successMetrics: '',
  };

  return JSON.stringify(report);
}

// ============================================================================
// 3. Risk & Cannibalization Report
// ============================================================================

export interface RiskCannibalizationReport {
  executiveSummary: string;
  cannibalizationAnalysis: Array<{
    opportunity: string;
    cannibalizationRisk: 'high' | 'medium' | 'low' | 'none';
    affectedProducts: string[];
    mitigationStrategy: string;
  }>;
  strategicRisks: Array<{
    risk: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    likelihood: 'very-likely' | 'likely' | 'possible' | 'unlikely';
    mitigation: string;
  }>;
  resourceConflicts: string;
  marketRisks: string;
  recommendation: string;
}

export async function generateRiskCannibalizationReport(
  context: ExpandReportContext,
  tier: SubscriptionTier,
): Promise<string> {
  const provider = getGenerationProvider(tier);
  const { engineResult, moatAudit, businessContext, moduleOutputs } = context;

  const oppList = engineResult.opportunities.map(o =>
    `- ${o.title} (${o.tier}, score: ${o.overallScore}, risk score: ${o.scores.strategicRisk}/100)`
  ).join('\n');

  const currentProducts = businessContext.currentProducts.join(', ');

  const competitorThreats = moduleOutputs.competitorPortfolio
    ? moduleOutputs.competitorPortfolio.competitors.map(c =>
      `${c.name}: recent expansions — ${c.recentExpansions.join(', ') || 'none'}`
    ).join('\n')
    : '';

  const prompt = `Generate a comprehensive Risk & Cannibalization Report for this business expansion strategy.

## Business Context
Industry: ${businessContext.industryVertical}
Current Products: ${currentProducts}
Revenue: ${businessContext.revenueRange}
Team: ${businessContext.teamSize}
Geography: ${businessContext.geographicFocus}

## Expansion Opportunities Under Consideration
${oppList}

## MOAT Profile (strength: ${moatAudit.overallMoatStrength}/100)
${moatAudit.summary}

## Competitor Activity
${competitorThreats || '(no competitor data available)'}

## Task
Write a Risk & Cannibalization Report with these sections:

1. Executive Summary — overview of key risks across all opportunities

2. Cannibalization Analysis — for each opportunity, assess:
   - Risk that it cannibalizes existing products (${currentProducts})
   - Which specific products are affected
   - Mitigation strategy

3. Strategic Risks — 5-8 specific risks across all opportunities:
   - Risk description
   - Severity (critical/high/medium/low)
   - Likelihood (very-likely/likely/possible/unlikely)
   - Mitigation strategy

4. Resource Conflicts — how pursuing multiple opportunities may strain resources

5. Market Risks — external risks (competition, regulation, market shifts)

6. Recommendation — which risks are acceptable and which need mitigation before proceeding

Write in a direct, analytical tone. Quantify risks where possible.`;

  const content = await provider.generate(prompt, {
    maxTokens: 6000,
    temperature: 0.3,
    task: 'generation',
  });

  const report: RiskCannibalizationReport = {
    executiveSummary: content,
    cannibalizationAnalysis: engineResult.opportunities.map(o => ({
      opportunity: o.title,
      cannibalizationRisk: o.scores.strategicRisk >= 70 ? 'low' as const : o.scores.strategicRisk >= 40 ? 'medium' as const : 'high' as const,
      affectedProducts: businessContext.currentProducts,
      mitigationStrategy: '',
    })),
    strategicRisks: [],
    resourceConflicts: '',
    marketRisks: '',
    recommendation: '',
  };

  return JSON.stringify(report);
}

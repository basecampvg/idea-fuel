/**
 * Financial Seeder Service
 *
 * Maps research pipeline data and interview responses to financial model assumptions.
 * Used when a user creates a financial model from a project's research data.
 *
 * All seeded values are marked as confidence: AI_ESTIMATE.
 * Missing fields are populated from industry template defaults.
 */

import type { TemplateDefinition } from '@forge/shared';
import { getTemplate } from './financial-templates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResearchData {
  synthesizedInsights?: {
    keyMetrics?: {
      customerAcquisitionCost?: number;
      lifetimeValue?: number;
      avgDealSize?: number;
      churnRate?: number;
    };
  };
  marketSizing?: {
    tam?: number;
    sam?: number;
    som?: number;
  };
  businessMetrics?: {
    revenuePotential?: {
      revenueModel?: string;
    };
    executionDifficulty?: {
      mvpTimeEstimate?: number;
    };
    gtmClarity?: {
      estimatedCAC?: number;
    };
  };
}

interface InterviewData {
  collectedData?: {
    price_point?: string | number;
    revenue_model?: string;
    funding_needs?: string | number;
    team_size?: string | number;
  };
}

interface TechStackData {
  estimatedMonthlyCost?: number;
}

export interface SeedInput {
  research?: ResearchData;
  interview?: InterviewData;
  techStack?: TechStackData;
}

export interface SeededAssumption {
  key: string;
  name: string;
  value: string;
  numericValue: string | null;
  category: string;
  valueType: string;
  unit: string | null;
  confidence: 'AI_ESTIMATE';
  source: string;
}

export interface SeedResult {
  assumptions: SeededAssumption[];
  seededCount: number;
  defaultedCount: number;
  totalCount: number;
  suggestedTemplate: string | null;
}

// ---------------------------------------------------------------------------
// Mapping logic
// ---------------------------------------------------------------------------

/**
 * Map from research/interview fields to assumption keys.
 * Each entry: [targetKey, source path description, extractor function]
 */
function extractResearchValues(input: SeedInput): Map<string, { value: number; source: string }> {
  const values = new Map<string, { value: number; source: string }>();

  const research = input.research;
  const interview = input.interview;
  const techStack = input.techStack;

  // Research synthesized insights
  if (research?.synthesizedInsights?.keyMetrics) {
    const km = research.synthesizedInsights.keyMetrics;
    if (km.customerAcquisitionCost != null) {
      values.set('cac', { value: km.customerAcquisitionCost, source: 'Research: Key Metrics' });
    }
    if (km.lifetimeValue != null) {
      values.set('ltv', { value: km.lifetimeValue, source: 'Research: Key Metrics' });
    }
    if (km.avgDealSize != null) {
      values.set('unit_price', { value: km.avgDealSize, source: 'Research: Avg Deal Size' });
    }
    if (km.churnRate != null) {
      values.set('monthly_churn', { value: km.churnRate, source: 'Research: Churn Rate' });
    }
  }

  // Market sizing
  if (research?.marketSizing) {
    const ms = research.marketSizing;
    if (ms.tam != null) values.set('tam', { value: ms.tam, source: 'Research: Market Sizing' });
    if (ms.sam != null) values.set('sam', { value: ms.sam, source: 'Research: Market Sizing' });
    if (ms.som != null) values.set('som', { value: ms.som, source: 'Research: Market Sizing' });
  }

  // Execution difficulty
  if (research?.businessMetrics?.executionDifficulty?.mvpTimeEstimate != null) {
    values.set('months_to_launch', {
      value: research.businessMetrics.executionDifficulty.mvpTimeEstimate,
      source: 'Research: Execution Difficulty',
    });
  }

  // GTM CAC (fallback if not already set from keyMetrics)
  if (research?.businessMetrics?.gtmClarity?.estimatedCAC != null && !values.has('cac')) {
    values.set('cac', {
      value: research.businessMetrics.gtmClarity.estimatedCAC,
      source: 'Research: GTM Clarity',
    });
  }

  // Interview data
  if (interview?.collectedData) {
    const cd = interview.collectedData;
    if (cd.price_point != null) {
      const price = typeof cd.price_point === 'number' ? cd.price_point : parseFloat(String(cd.price_point));
      if (!isNaN(price) && !values.has('unit_price')) {
        values.set('unit_price', { value: price, source: 'Interview: Price Point' });
      }
    }
    if (cd.funding_needs != null) {
      const funding = typeof cd.funding_needs === 'number' ? cd.funding_needs : parseFloat(String(cd.funding_needs));
      if (!isNaN(funding)) {
        values.set('total_funding', { value: funding, source: 'Interview: Funding Needs' });
      }
    }
    if (cd.team_size != null) {
      const team = typeof cd.team_size === 'number' ? cd.team_size : parseFloat(String(cd.team_size));
      if (!isNaN(team)) {
        values.set('headcount', { value: team, source: 'Interview: Team Size' });
      }
    }
  }

  // Tech stack costs
  if (techStack?.estimatedMonthlyCost != null) {
    values.set('infrastructure_costs', {
      value: techStack.estimatedMonthlyCost,
      source: 'Tech Stack Analysis',
    });
  }

  return values;
}

/**
 * Detect the best-fit template from research data.
 */
function detectTemplate(input: SeedInput): string {
  const revenueModel = input.research?.businessMetrics?.revenuePotential?.revenueModel
    ?? input.interview?.collectedData?.revenue_model;

  if (!revenueModel) return 'general';

  const model = String(revenueModel).toLowerCase();

  if (model.includes('saas') || model.includes('subscription') || model.includes('recurring')) {
    return 'saas';
  }
  if (model.includes('ecommerce') || model.includes('e-commerce') || model.includes('retail') || model.includes('product')) {
    return 'ecommerce';
  }
  if (model.includes('service') || model.includes('consulting') || model.includes('agency') || model.includes('freelance')) {
    return 'professional-services';
  }

  return 'general';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Seed financial model assumptions from research data.
 *
 * @param input - Research, interview, and tech stack data
 * @param knowledgeLevel - Knowledge level to use for template defaults
 * @param templateSlug - Optional template override (if not provided, auto-detected)
 */
export function seedFromResearch(
  input: SeedInput,
  knowledgeLevel: 'beginner' | 'standard' | 'expert' = 'beginner',
  templateSlug?: string,
): SeedResult {
  const suggestedTemplate = templateSlug ?? detectTemplate(input);
  const template = getTemplate(suggestedTemplate);

  if (!template) {
    return {
      assumptions: [],
      seededCount: 0,
      defaultedCount: 0,
      totalCount: 0,
      suggestedTemplate,
    };
  }

  const researchValues = extractResearchValues(input);
  const templateAssumptions = template.assumptions[knowledgeLevel];

  const seededAssumptions: SeededAssumption[] = [];
  let seededCount = 0;
  let defaultedCount = 0;

  for (const tplAssumption of templateAssumptions) {
    const researchValue = researchValues.get(tplAssumption.key);

    if (researchValue) {
      // Use research-derived value
      seededAssumptions.push({
        key: tplAssumption.key,
        name: tplAssumption.name,
        value: String(researchValue.value),
        numericValue: String(researchValue.value),
        category: tplAssumption.category ?? 'COSTS',
        valueType: tplAssumption.valueType,
        unit: tplAssumption.unit ?? null,
        confidence: 'AI_ESTIMATE',
        source: researchValue.source,
      });
      seededCount++;
    } else {
      // Fall back to template default
      seededAssumptions.push({
        key: tplAssumption.key,
        name: tplAssumption.name,
        value: String(tplAssumption.default),
        numericValue: typeof tplAssumption.default === 'number' ? String(tplAssumption.default) : null,
        category: tplAssumption.category ?? 'COSTS',
        valueType: tplAssumption.valueType,
        unit: tplAssumption.unit ?? null,
        confidence: 'AI_ESTIMATE',
        source: `Template: ${template.name}`,
      });
      defaultedCount++;
    }
  }

  return {
    assumptions: seededAssumptions,
    seededCount,
    defaultedCount,
    totalCount: seededAssumptions.length,
    suggestedTemplate,
  };
}

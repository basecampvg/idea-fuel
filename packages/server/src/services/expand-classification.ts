/**
 * Expand Mode: AI Business Classification Service
 *
 * Takes a BusinessContext from the intake form and classifies the business into
 * a taxonomy, determines optimal interview track order, configures research
 * modules, and generates vertical-specific seed assumptions.
 *
 * Called inline during project creation (not queued) — must complete in <5s.
 */

import { z } from 'zod';
import type { BusinessContext, ClassificationResult, BusinessTaxonomy, ExpandTrackId } from '@forge/shared';
import { getExtractionProvider } from '../providers';

// ============================================================================
// Classification Output Schema (Zod for structured extraction)
// ============================================================================

const classificationOutputSchema = z.object({
  taxonomy: z.enum([
    'services-local',
    'services-professional',
    'saas',
    'ecommerce',
    'physical-product',
    'content',
    'marketplace',
    'other',
  ]),
  interviewTrackOrder: z.tuple([
    z.enum(['A', 'B', 'C']),
    z.enum(['A', 'B', 'C']),
    z.enum(['A', 'B', 'C']),
  ]),
  researchModuleConfig: z.object({
    adjacencyScan: z.boolean(),
    competitorPortfolio: z.boolean(),
    demandMining: z.boolean(),
    pricingCeiling: z.boolean(),
  }),
  seedAssumptions: z.record(
    z.string(),
    z.object({
      value: z.number(),
      confidence: z.literal('AI_ESTIMATE'),
    })
  ),
});

// ============================================================================
// Classification Prompt
// ============================================================================

function buildClassificationPrompt(ctx: BusinessContext): string {
  return `You are a business classification engine for an expansion planning tool. Analyze this existing business and return a structured classification.

## Business Context
- Industry: ${ctx.industryVertical}
- Years in Operation: ${ctx.yearsInOperation}
- Revenue Range: ${ctx.revenueRange}
- Customer Type: ${ctx.customerType}
- Current Products/Services: ${ctx.currentProducts.join(', ')}
- Geographic Focus: ${ctx.geographicFocus}
- Team Size: ${ctx.teamSize}
${ctx.businessName ? `- Business Name: ${ctx.businessName}` : ''}

## Classification Tasks

### 1. taxonomy
Classify into EXACTLY ONE of these business types based on primary revenue model and operations:
- "services-local": Local/regional service businesses (restaurants, salons, contractors, clinics)
- "services-professional": Professional/knowledge services (consulting, agencies, law firms, accounting)
- "saas": Software-as-a-service or digital subscription businesses
- "ecommerce": Online retail, D2C brands, dropshipping
- "physical-product": Manufacturing, wholesale, CPG, hardware
- "content": Media, publishing, courses, creator economy
- "marketplace": Two-sided platforms connecting buyers and sellers
- "other": Doesn't fit any category above

### 2. interviewTrackOrder
Determine the optimal order to interview this business owner across 3 tracks:
- Track A: Product Line Audit (current offerings, revenue breakdown, margins)
- Track B: Customer Intelligence (customer profiles, churn, spending patterns)
- Track C: Strategic Context (goals, capital, risk tolerance, vision)

Return as [first, second, third]. Choose the order that surfaces the most important information earliest for THIS type of business. For example:
- A service business benefits from understanding customers first → ["B", "A", "C"]
- A SaaS business benefits from product audit first → ["A", "B", "C"]
- A business in crisis benefits from strategic context first → ["C", "A", "B"]

### 3. researchModuleConfig
Enable/disable research modules based on what's relevant for this business type:
- adjacencyScan: Find adjacent markets and expansion opportunities (almost always true)
- competitorPortfolio: Analyze competitor product portfolios (true for most, less useful for hyper-local)
- demandMining: Mine customer demand signals from social/search data (true for B2C/ecommerce, less for B2B services)
- pricingCeiling: Analyze pricing ceilings and elasticity (true for product businesses, less for custom services)

### 4. seedAssumptions
Provide reasonable industry-typical estimates for these financial assumptions. Use the business context to make informed estimates. Return as a record of key → { value, confidence: "AI_ESTIMATE" }.

Required keys (provide estimates for ALL):
- "unit_price": Average price per unit/engagement in dollars
- "cac": Customer acquisition cost in dollars
- "monthly_churn": Monthly churn rate as a decimal percentage (e.g., 5 = 5%)
- "tam": Total addressable market in dollars
- "sam": Serviceable addressable market in dollars
- "conversion_rate": Lead-to-customer conversion rate as percentage
- "gross_margin": Gross margin as percentage
- "monthly_growth": Monthly growth rate as percentage

Base your estimates on the industry vertical, revenue range, customer type, and geographic focus provided. Be realistic — these are starting points the user will refine.

## Response Format
Return a JSON object with exactly these 4 keys: taxonomy, interviewTrackOrder, researchModuleConfig, seedAssumptions.`;
}

// ============================================================================
// Default Fallback (used when AI classification fails)
// ============================================================================

const DEFAULT_CLASSIFICATION: ClassificationResult = {
  taxonomy: 'other',
  interviewTrackOrder: ['A', 'B', 'C'],
  researchModuleConfig: {
    adjacencyScan: true,
    competitorPortfolio: true,
    demandMining: true,
    pricingCeiling: true,
  },
  seedAssumptions: {},
};

// ============================================================================
// Main Classification Function
// ============================================================================

/**
 * Classify a business context using AI extraction.
 * Returns taxonomy, interview track order, research module config, and seed assumptions.
 *
 * Falls back to safe defaults if classification fails — never throws.
 */
export async function classifyBusinessContext(
  businessContext: BusinessContext
): Promise<ClassificationResult> {
  try {
    const provider = getExtractionProvider();
    const prompt = buildClassificationPrompt(businessContext);

    const result = await provider.extract(prompt, classificationOutputSchema, {
      maxTokens: 2000,
      temperature: 0.3,
      task: 'extraction',
    });

    // Validate track order has all 3 unique tracks
    const tracks = new Set(result.interviewTrackOrder);
    if (tracks.size !== 3 || !tracks.has('A') || !tracks.has('B') || !tracks.has('C')) {
      console.warn('[Classification] Invalid track order, using default:', result.interviewTrackOrder);
      result.interviewTrackOrder = ['A', 'B', 'C'];
    }

    return result as ClassificationResult;
  } catch (error) {
    console.error('[Classification] AI classification failed, using defaults:', error);
    return DEFAULT_CLASSIFICATION;
  }
}

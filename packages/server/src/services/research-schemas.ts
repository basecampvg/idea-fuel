import { z } from 'zod';

/**
 * Zod schemas for research extraction outputs
 * Used by AIProvider.extract() for type-safe structured extraction
 */

// ============================================================================
// Insights Extraction Schema
// ============================================================================

export const InsightsSchema = z.object({
  marketAnalysis: z.object({
    size: z.string(),
    growth: z.string(),
    trends: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  competitors: z.array(z.object({
    name: z.string(),
    description: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    positioning: z.string(),
  })),
  painPoints: z.array(z.object({
    problem: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
    currentSolutions: z.array(z.string()),
    gaps: z.array(z.string()),
  })),
  positioning: z.object({
    uniqueValueProposition: z.string(),
    targetAudience: z.string(),
    differentiators: z.array(z.string()),
    messagingPillars: z.array(z.string()),
  }),
  whyNow: z.object({
    marketTriggers: z.array(z.string()),
    timingFactors: z.array(z.string()),
    urgencyScore: z.number().min(0).max(100),
  }),
  proofSignals: z.object({
    demandIndicators: z.array(z.string()),
    validationOpportunities: z.array(z.string()),
    riskFactors: z.array(z.string()),
  }),
  keywords: z.object({
    primary: z.array(z.string()),
    secondary: z.array(z.string()),
    longTail: z.array(z.string()),
  }),
});

// ============================================================================
// Scores Extraction Schema (single pass)
// ============================================================================

export const ScoresPassSchema = z.object({
  opportunityScore: z.number().min(0).max(100),
  opportunityJustification: z.string(),
  problemScore: z.number().min(0).max(100),
  problemJustification: z.string(),
  feasibilityScore: z.number().min(0).max(100),
  feasibilityJustification: z.string(),
  whyNowScore: z.number().min(0).max(100),
  whyNowJustification: z.string(),
});

// ============================================================================
// Business Metrics Extraction Schema
// ============================================================================

export const BusinessMetricsSchema = z.object({
  revenuePotential: z.object({
    rating: z.enum(['high', 'medium', 'low']),
    estimate: z.string(),
    confidence: z.number().min(0).max(100),
  }),
  executionDifficulty: z.object({
    rating: z.enum(['easy', 'moderate', 'hard']),
    factors: z.array(z.string()),
    soloFriendly: z.boolean(),
  }),
  gtmClarity: z.object({
    rating: z.enum(['clear', 'moderate', 'unclear']),
    channels: z.array(z.string()),
    confidence: z.number().min(0).max(100),
  }),
  founderFit: z.object({
    percentage: z.number().min(0).max(100),
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
  }),
});

// ============================================================================
// Market Sizing Extraction Schema
// ============================================================================

export const MarketSizingSchema = z.object({
  tam: z.object({
    value: z.number(),
    formattedValue: z.string(),
    growthRate: z.number(),
    confidence: z.enum(['high', 'medium', 'low']),
    timeframe: z.string(),
  }),
  sam: z.object({
    value: z.number(),
    formattedValue: z.string(),
    growthRate: z.number(),
    confidence: z.enum(['high', 'medium', 'low']),
    timeframe: z.string(),
  }),
  som: z.object({
    value: z.number(),
    formattedValue: z.string(),
    growthRate: z.number(),
    confidence: z.enum(['high', 'medium', 'low']),
    timeframe: z.string(),
  }),
  segments: z.array(z.object({
    name: z.string(),
    size: z.number(),
    formattedSize: z.string(),
    growthPotential: z.enum(['high', 'medium', 'low']),
    priority: z.enum(['primary', 'secondary', 'tertiary']),
  })),
  assumptions: z.array(z.object({
    level: z.enum(['tam', 'sam', 'som']),
    assumption: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    impact: z.string(),
  })),
  sources: z.array(z.object({
    type: z.string(),
    url: z.string().optional(),
    value: z.string(),
  })),
  methodology: z.string(),
});

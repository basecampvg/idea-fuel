import { z } from 'zod';

/**
 * Zod schemas for research extraction outputs
 * Used by AIProvider.extract() for type-safe structured extraction
 */

// ============================================================================
// Shared Helpers
// ============================================================================

/**
 * Coerce an array of mixed strings/objects into a string array.
 * LLMs sometimes return { threat: "...", impact: "..." } instead of plain strings.
 * Uses preprocess to normalize before standard z.array(z.string()) validation.
 */
function coerceItemToString(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const values = Object.values(item as Record<string, unknown>).filter(
      (v): v is string => typeof v === 'string' && v.length > 10
    );
    return values.sort((a, b) => b.length - a.length)[0] || JSON.stringify(item);
  }
  return String(item);
}

const coerceStringArray: z.ZodType<string[]> = z.preprocess(
  (val: unknown) => {
    if (!Array.isArray(val)) return val;
    return val.map(coerceItemToString);
  },
  z.array(z.string()).min(3).max(8)
) as z.ZodType<string[]>;

// ============================================================================
// Insights Extraction Schema
// ============================================================================

export const InsightsSchema = z.object({
  marketAnalysis: z.object({
    size: z.string(),
    growth: z.string(),
    trends: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: coerceStringArray,
    marketDynamics: z.object({
      stage: z.enum(['emerging', 'growing', 'mature', 'declining']),
      consolidationLevel: z.string(),
      entryBarriers: z.array(z.string()),
      regulatoryEnvironment: z.string(),
    }).optional(),
    keyMetrics: z.object({
      cagr: z.string(),
      avgDealSize: z.string(),
      customerAcquisitionCost: z.string(),
      lifetimeValue: z.string(),
      ltvCacRatio: z.string().optional(),
      avgRevenuePerUser: z.string().optional(),
      paybackPeriodMonths: z.string().optional(),
      grossMargin: z.string().optional(),
      churnRate: z.string().optional(),
      netRevenueRetention: z.string().optional(),
    }).optional(),
    adjacentMarkets: z.array(z.object({
      name: z.string(),
      relevance: z.string(),
      crossoverOpportunity: z.string(),
    })).optional(),
  }),
  competitors: z.array(z.object({
    name: z.string(),
    description: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    positioning: z.string(),
    website: z.string().optional(),
    fundingStage: z.string().optional(),
    estimatedRevenue: z.string().optional(),
    targetSegment: z.string().optional(),
    pricingModel: z.string().optional(),
    keyDifferentiator: z.string().optional(),
    vulnerability: z.string().optional(),
  })),
  painPoints: z.array(z.object({
    problem: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
    currentSolutions: z.array(z.string()),
    gaps: z.array(z.string()),
    affectedSegment: z.string().optional(),
    frequencyOfOccurrence: z.string().optional(),
    costOfInaction: z.string().optional(),
    emotionalImpact: z.string().optional(),
    evidenceQuotes: z.array(z.string()).optional(),
  })),
  positioning: z.object({
    uniqueValueProposition: z.string(),
    targetAudience: z.string(),
    differentiators: z.array(z.string()),
    messagingPillars: z.array(z.string()),
    idealCustomerProfile: z.object({
      persona: z.string(),
      demographics: z.string(),
      psychographics: z.string(),
      buyingTriggers: z.array(z.string()),
    }).optional(),
    competitivePositioning: z.object({
      category: z.string(),
      against: z.string(),
      anchorBenefit: z.string(),
      proofPoint: z.string(),
    }).optional(),
    messagingFramework: z.object({
      headline: z.string(),
      subheadline: z.string(),
      elevatorPitch: z.string(),
      objectionHandlers: z.array(z.object({
        objection: z.string(),
        response: z.string(),
      })),
    }).optional(),
  }),
  whyNow: z.object({
    marketTriggers: z.array(z.string()),
    timingFactors: z.array(z.string()),
    urgencyScore: z.number().min(0).max(100),
    windowOfOpportunity: z.object({
      opens: z.string(),
      closesBy: z.string(),
      reasoning: z.string(),
    }).optional(),
    catalysts: z.array(z.object({
      event: z.string(),
      impact: z.enum(['high', 'medium', 'low']),
      timeframe: z.string(),
      howToLeverage: z.string(),
    })).optional(),
    urgencyNarrative: z.string().optional(),
  }),
  proofSignals: z.object({
    demandIndicators: z.array(z.string()),
    validationOpportunities: z.array(z.string()),
    riskFactors: z.array(z.string()),
    demandStrength: z.object({
      score: z.number().min(0).max(100),
      searchVolumeSignal: z.string(),
      communitySignal: z.string(),
      spendingSignal: z.string(),
    }).optional(),
    validationExperiments: z.array(z.object({
      experiment: z.string(),
      hypothesis: z.string(),
      cost: z.string(),
      timeframe: z.string(),
    })).optional(),
    riskMitigation: z.array(z.object({
      risk: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
      mitigation: z.string(),
    })).optional(),
  }),
  keywords: z.object({
    primary: z.array(z.string()),
    secondary: z.array(z.string()),
    longTail: z.array(z.string()),
  }),
});

// ============================================================================
// Per-Chunk Extraction Schemas (derived from InsightsSchema to prevent drift)
// Each chunk extracts its relevant sections independently in parallel
// ============================================================================

export const MarketChunkSchema = z.object({
  marketAnalysis: InsightsSchema.shape.marketAnalysis,
  keywords: InsightsSchema.shape.keywords,
});

export const CompetitorsChunkSchema = z.object({
  competitors: InsightsSchema.shape.competitors,
  positioning: InsightsSchema.shape.positioning,
});

export const PainPointsChunkSchema = z.object({
  painPoints: InsightsSchema.shape.painPoints,
});

export const TimingChunkSchema = z.object({
  whyNow: InsightsSchema.shape.whyNow,
  proofSignals: InsightsSchema.shape.proofSignals,
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
    revenueModel: z.string().optional(),
    timeToFirstRevenue: z.string().optional(),
    unitEconomics: z.string().optional(),
  }),
  executionDifficulty: z.object({
    rating: z.enum(['easy', 'moderate', 'hard']),
    factors: z.array(z.string()),
    soloFriendly: z.boolean(),
    mvpTimeEstimate: z.string().optional(),
    criticalPath: z.array(z.string()).optional(),
    biggestRisk: z.string().optional(),
  }),
  gtmClarity: z.object({
    rating: z.enum(['clear', 'moderate', 'unclear']),
    channels: z.array(z.string()),
    confidence: z.number().min(0).max(100),
    primaryChannel: z.string().optional(),
    estimatedCAC: z.string().optional(),
    firstMilestone: z.string().optional(),
  }),
  founderFit: z.object({
    percentage: z.number().min(0).max(100),
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
    criticalSkillNeeded: z.string().optional(),
    recommendedFirstHire: z.string().optional(),
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

// ============================================================================
// Generation Output Schemas
// ============================================================================

export const UserStorySchema = z.object({
  scenario: z.string(),
  protagonist: z.string(),
  problem: z.string(),
  solution: z.string(),
  outcome: z.string(),
  dayInTheLife: z.object({
    before: z.string(),
    after: z.string(),
    timeSaved: z.string(),
  }).optional(),
  emotionalArc: z.object({
    frustration: z.string(),
    discovery: z.string(),
    relief: z.string(),
  }).optional(),
  quote: z.string().optional(),
});

export const ValueLadderSchema = z.object({
  tiers: z.array(z.object({
    name: z.string(),
    price: z.string(),
    description: z.string(),
    features: z.array(z.string()),
    targetCustomer: z.string(),
  })),
  strategy: z.string(),
});

export const ActionPromptsSchema = z.object({
  prompts: z.array(z.object({
    action: z.string(),
    description: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    timeline: z.string(),
    resources: z.array(z.string()).optional(),
  })),
});

export const TechStackSchema = z.object({
  recommendations: z.array(z.object({
    category: z.string(),
    technology: z.string(),
    reasoning: z.string(),
    alternatives: z.array(z.string()).optional(),
  })),
  architecture: z.string(),
  estimatedComplexity: z.enum(['low', 'medium', 'high']),
});

// ============================================================================
// SWOT Analysis Schema
// ============================================================================

export const SWOTSchema = z.object({
  strengths: coerceStringArray,
  weaknesses: coerceStringArray,
  opportunities: coerceStringArray,
  threats: coerceStringArray,
});

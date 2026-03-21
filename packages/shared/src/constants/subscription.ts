// Subscription tier feature definitions
// Centralized here for use in both server and client

import type { SubscriptionTier, InterviewMode, ReportTier } from '../types';

export interface ReportLimitsByMode {
  SPARK: number;
  LIGHT: number;
  IN_DEPTH: number;
}

export interface SubscriptionFeatures {
  reportLimits: ReportLimitsByMode;
  financialModelLimit: number;
  reportTierAccess: readonly ReportTier[];
  interviewModes: readonly InterviewMode[];
  prioritySupport: boolean;
  aiQuality: 'standard' | 'enhanced' | 'premium';
  expandPipelineAccess?: boolean;
}

export const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  FREE: {
    reportLimits: { SPARK: 0, LIGHT: 0, IN_DEPTH: 0 },
    financialModelLimit: 1,
    reportTierAccess: [] as const,
    interviewModes: [] as const,
    prioritySupport: false,
    aiQuality: 'standard',
  },
  PRO: {
    reportLimits: { SPARK: 5, LIGHT: 3, IN_DEPTH: 1 },
    financialModelLimit: 10,
    reportTierAccess: ['BASIC', 'PRO'] as const,
    interviewModes: ['SPARK', 'LIGHT', 'IN_DEPTH'] as const,
    prioritySupport: true,
    aiQuality: 'enhanced',
  },
  ENTERPRISE: {
    reportLimits: { SPARK: 10, LIGHT: 5, IN_DEPTH: 2 },
    financialModelLimit: 50,
    reportTierAccess: ['BASIC', 'PRO', 'FULL'] as const,
    interviewModes: ['SPARK', 'LIGHT', 'IN_DEPTH'] as const,
    prioritySupport: true,
    aiQuality: 'premium',
  },
  SCALE: {
    reportLimits: { SPARK: 10, LIGHT: 5, IN_DEPTH: 2 },
    financialModelLimit: 100,
    reportTierAccess: ['BASIC', 'PRO', 'FULL'] as const,
    interviewModes: ['SPARK', 'LIGHT', 'IN_DEPTH'] as const,
    prioritySupport: true,
    aiQuality: 'premium',
    expandPipelineAccess: true,
  },
  TESTER: {
    reportLimits: { SPARK: 1, LIGHT: 1, IN_DEPTH: 1 },
    financialModelLimit: 50,
    reportTierAccess: ['BASIC', 'PRO', 'FULL'] as const,
    interviewModes: ['SPARK', 'LIGHT', 'IN_DEPTH'] as const,
    prioritySupport: true,
    aiQuality: 'premium',
    expandPipelineAccess: true,
  },
} as const;

export interface SubscriptionPricing {
  price: number | null; // null = "Contact us"
  period: 'month' | 'year' | 'forever';
  currency: string;
}

export const SUBSCRIPTION_PRICING: Record<SubscriptionTier, SubscriptionPricing> = {
  FREE: { price: 0, period: 'forever', currency: 'USD' },
  PRO: { price: 29, period: 'month', currency: 'USD' },
  ENTERPRISE: { price: 99, period: 'month', currency: 'USD' },
  SCALE: { price: 199, period: 'month', currency: 'USD' },
  TESTER: { price: 0, period: 'forever', currency: 'USD' },
} as const;

// Feature list for tier comparison display
export interface TierFeature {
  id: string;
  name: string;
  description: string;
  free: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
  scale: boolean | string;
}

export const TIER_FEATURES: TierFeature[] = [
  {
    id: 'spark',
    name: 'Spark Reports',
    description: 'Quick validation - demand signals & market sizing',
    free: false,
    pro: '5 reports',
    enterprise: '10 reports',
    scale: '10 reports',
  },
  {
    id: 'light',
    name: 'Light Interview Reports',
    description: 'Quick discovery with 10 questions + enhanced analysis',
    free: false,
    pro: '3 reports',
    enterprise: '5 reports',
    scale: '5 reports',
  },
  {
    id: 'in_depth',
    name: 'In-Depth Interview Reports',
    description: 'Comprehensive 65-question discovery + full analysis',
    free: false,
    pro: '1 report',
    enterprise: '2 reports',
    scale: '2 reports',
  },
  {
    id: 'financial_models',
    name: 'Financial Models',
    description: 'Revenue forecasting & break-even analysis',
    free: '1 model',
    pro: '10 models',
    enterprise: '50 models',
    scale: '100 models',
  },
  {
    id: 'full_reports',
    name: 'Full Reports',
    description: 'Comprehensive reports with all sections',
    free: false,
    pro: false,
    enterprise: true,
    scale: true,
  },
  {
    id: 'expand_pipeline',
    name: 'Expand Pipeline',
    description: 'Adjacency scan, competitor portfolio, demand mining & pricing ceiling',
    free: false,
    pro: false,
    enterprise: false,
    scale: true,
  },
  {
    id: 'ai_quality',
    name: 'AI Quality',
    description: 'Reasoning depth and analysis quality',
    free: false,
    pro: 'Enhanced',
    enterprise: 'Premium',
    scale: 'Premium',
  },
  {
    id: 'support',
    name: 'Priority Support',
    description: 'Fast-track support response',
    free: false,
    pro: true,
    enterprise: true,
    scale: true,
  },
];

// Upgrade reason types for modal content
export type UpgradeReasonType = 'interview_mode' | 'report_limit' | 'report_tier' | 'feature' | 'expand_access';

export interface UpgradeReason {
  type: UpgradeReasonType;
  mode?: InterviewMode;
  currentCount?: number;
  limit?: number;
  tier?: ReportTier;
  feature?: string;
}

// Content for upgrade prompts based on reason
export interface UpgradePromptContent {
  title: string;
  description: string;
  benefits: string[];
  recommendedTier: SubscriptionTier;
}

export function getUpgradePromptContent(
  reason: UpgradeReason,
  currentTier: SubscriptionTier
): UpgradePromptContent {
  switch (reason.type) {
    case 'interview_mode':
      return {
        title: 'Unlock In-Depth Interviews',
        description:
          'Deep-dive interviews with 65 questions uncover insights that lead to better business decisions.',
        benefits: [
          'Comprehensive 65-question discovery',
          'All 31 data points collected',
          'Higher quality reports',
          'Deeper market insights',
        ],
        recommendedTier: 'PRO',
      };

    case 'report_limit':
      return {
        title: 'Report Limit Reached',
        description: `You've used all your ${reason.mode ? reason.mode.replace('_', '-').toLowerCase() : ''} reports on the ${currentTier} plan. Upgrade for more.`,
        benefits: [
          'More Spark reports for quick validation',
          'More Light interview reports',
          'More In-Depth interview reports',
          'Enhanced AI analysis',
        ],
        recommendedTier: currentTier === 'FREE' ? 'PRO' : 'ENTERPRISE',
      };

    case 'report_tier': {
      const tierName = reason.tier === 'FULL' ? 'Full' : 'Pro';
      return {
        title: `Unlock ${tierName} Reports`,
        description: `${tierName} reports include deeper analysis and more actionable insights for your business.`,
        benefits: [
          'Comprehensive market analysis',
          'Detailed competitor breakdowns',
          'Advanced positioning strategies',
          'Full go-to-market plans',
        ],
        recommendedTier: reason.tier === 'FULL' ? 'ENTERPRISE' : 'PRO',
      };
    }

    case 'expand_access':
      return {
        title: 'Unlock Expand Pipeline',
        description:
          'The Expand pipeline helps you grow an existing business with adjacency scans, competitor portfolios, demand mining, and pricing ceiling analysis.',
        benefits: [
          'Adjacency scan for new opportunities',
          'Competitor portfolio analysis',
          'Demand mining research',
          'Pricing ceiling optimization',
        ],
        recommendedTier: 'SCALE',
      };

    case 'feature':
    default:
      return {
        title: 'Upgrade Your Plan',
        description: 'Get access to premium features and take your business planning to the next level.',
        benefits: [
          'More reports across all modes',
          'In-depth interviews',
          'Higher quality reports',
          'Priority support',
        ],
        recommendedTier: 'PRO',
      };
  }
}

// Helper functions for subscription checks
export function canAccessInterviewMode(
  tier: SubscriptionTier,
  mode: InterviewMode
): boolean {
  return SUBSCRIPTION_FEATURES[tier].interviewModes.includes(mode);
}

export function canAccessReportTier(
  subscriptionTier: SubscriptionTier,
  reportTier: ReportTier
): boolean {
  return SUBSCRIPTION_FEATURES[subscriptionTier].reportTierAccess.includes(reportTier);
}

export function canCreateReport(
  tier: SubscriptionTier,
  mode: InterviewMode,
  currentModeCount: number
): boolean {
  const limit = SUBSCRIPTION_FEATURES[tier].reportLimits[mode];
  return currentModeCount < limit;
}

export function getReportsRemaining(
  tier: SubscriptionTier,
  mode: InterviewMode,
  currentModeCount: number
): number {
  const limit = SUBSCRIPTION_FEATURES[tier].reportLimits[mode];
  return Math.max(0, limit - currentModeCount);
}

export function canCreateFinancialModel(
  tier: SubscriptionTier,
  currentCount: number,
): boolean {
  const limit = SUBSCRIPTION_FEATURES[tier].financialModelLimit;
  return currentCount < limit;
}

export function getFinancialModelsRemaining(
  tier: SubscriptionTier,
  currentCount: number,
): number {
  const limit = SUBSCRIPTION_FEATURES[tier].financialModelLimit;
  return Math.max(0, limit - currentCount);
}

/**
 * Check if a subscription tier has access to the Expand pipeline.
 * Only SCALE and TESTER tiers have expand pipeline access.
 */
export function canAccessExpandPipeline(tier: SubscriptionTier): boolean {
  return tier === 'SCALE' || tier === 'TESTER';
}

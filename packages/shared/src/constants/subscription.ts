// Subscription tier feature definitions
// Centralized here for use in both server and client

import type { SubscriptionTier, InterviewMode, ReportTier } from '../types';

export interface SubscriptionFeatures {
  maxIdeas: number; // -1 = unlimited
  maxReportsPerIdea: number;
  reportTierAccess: readonly ReportTier[];
  interviewModes: readonly InterviewMode[];
  prioritySupport: boolean;
  aiQuality: 'standard' | 'enhanced' | 'premium';
}

export const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  FREE: {
    maxIdeas: -1, // Unlimited drafts
    maxReportsPerIdea: 0,
    reportTierAccess: [] as const,
    interviewModes: [] as const,
    prioritySupport: false,
    aiQuality: 'standard',
  },
  PRO: {
    maxIdeas: 20,
    maxReportsPerIdea: 10,
    reportTierAccess: ['BASIC', 'PRO'] as const,
    interviewModes: ['SPARK', 'LIGHT', 'IN_DEPTH'] as const,
    prioritySupport: true,
    aiQuality: 'enhanced',
  },
  ENTERPRISE: {
    maxIdeas: -1, // Unlimited
    maxReportsPerIdea: 10,
    reportTierAccess: ['BASIC', 'PRO', 'FULL'] as const,
    interviewModes: ['SPARK', 'LIGHT', 'IN_DEPTH'] as const,
    prioritySupport: true,
    aiQuality: 'premium',
  },
} as const;

export interface SubscriptionPricing {
  price: number | null; // null = "Contact us"
  period: 'month' | 'year' | 'forever';
  currency: string;
}

export const SUBSCRIPTION_PRICING: Record<SubscriptionTier, SubscriptionPricing> = {
  FREE: { price: 0, period: 'forever', currency: 'USD' },
  PRO: { price: null, period: 'month', currency: 'USD' }, // TBD
  ENTERPRISE: { price: null, period: 'month', currency: 'USD' }, // TBD
} as const;

// Feature list for tier comparison display
export interface TierFeature {
  id: string;
  name: string;
  description: string;
  free: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

export const TIER_FEATURES: TierFeature[] = [
  {
    id: 'ideas',
    name: 'Business Ideas',
    description: 'Number of ideas you can explore',
    free: 'Unlimited drafts',
    pro: '20 ideas',
    enterprise: 'Unlimited',
  },
  {
    id: 'reports',
    name: 'Reports per Idea',
    description: 'Documents generated for each idea',
    free: false,
    pro: '10 reports',
    enterprise: '10 reports',
  },
  {
    id: 'spark',
    name: 'Spark Mode',
    description: 'Quick validation - demand signals & market sizing',
    free: false,
    pro: true,
    enterprise: true,
  },
  {
    id: 'light',
    name: 'Light Interview',
    description: 'Quick discovery with 10 questions',
    free: false,
    pro: true,
    enterprise: true,
  },
  {
    id: 'in_depth',
    name: 'In-Depth Interview',
    description: 'Comprehensive 65-question discovery',
    free: false,
    pro: true,
    enterprise: true,
  },
  {
    id: 'basic_reports',
    name: 'Basic Reports',
    description: 'Core insights and essential analysis',
    free: false,
    pro: true,
    enterprise: true,
  },
  {
    id: 'pro_reports',
    name: 'Pro Reports',
    description: 'Enhanced analysis with deeper research',
    free: false,
    pro: true,
    enterprise: true,
  },
  {
    id: 'full_reports',
    name: 'Full Reports',
    description: 'Comprehensive reports with all sections',
    free: false,
    pro: false,
    enterprise: true,
  },
  {
    id: 'ai_quality',
    name: 'AI Quality',
    description: 'Reasoning depth and analysis quality',
    free: false,
    pro: 'Enhanced',
    enterprise: 'Premium',
  },
  {
    id: 'support',
    name: 'Priority Support',
    description: 'Fast-track support response',
    free: false,
    pro: true,
    enterprise: true,
  },
];

// Upgrade reason types for modal content
export type UpgradeReasonType = 'interview_mode' | 'idea_limit' | 'report_tier' | 'feature';

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

    case 'idea_limit':
      return {
        title: 'Idea Limit Reached',
        description: `You've used all ${reason.limit} ideas on the ${currentTier} plan. Upgrade to explore more opportunities.`,
        benefits: [
          currentTier === 'FREE' ? 'Explore up to 20 ideas' : 'Unlimited ideas',
          'In-depth interviews available',
          'Enhanced AI analysis',
          'Priority support',
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

    case 'feature':
    default:
      return {
        title: 'Upgrade Your Plan',
        description: 'Get access to premium features and take your business planning to the next level.',
        benefits: [
          'More ideas to explore',
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

export function canCreateIdea(tier: SubscriptionTier, currentCount: number): boolean {
  const maxIdeas = SUBSCRIPTION_FEATURES[tier].maxIdeas;
  return maxIdeas === -1 || currentCount < maxIdeas;
}

export function getIdeasRemaining(tier: SubscriptionTier, currentCount: number): number {
  const maxIdeas = SUBSCRIPTION_FEATURES[tier].maxIdeas;
  if (maxIdeas === -1) return Infinity;
  return Math.max(0, maxIdeas - currentCount);
}

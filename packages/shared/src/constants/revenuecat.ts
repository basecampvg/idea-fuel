// RevenueCat-specific constants for mobile in-app subscriptions
// Product IDs map to App Store Connect / Google Play Console product identifiers

import type { SubscriptionTier } from '../types';

/**
 * Maps RevenueCat product identifiers to internal subscription tiers.
 * Keys are the product IDs configured in RevenueCat dashboard.
 */
export const REVENUECAT_PRODUCT_MAP: Record<string, SubscriptionTier> = {
  ideafuel_mobile_monthly: 'MOBILE',
  ideafuel_pro_monthly: 'PRO',
  ideafuel_enterprise_monthly: 'ENTERPRISE',
  ideafuel_agency_monthly: 'SCALE',
};

/**
 * Tier rank for comparison (higher = more features).
 * Used to determine upgrade/downgrade direction and disable lower-tier buttons.
 */
export const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  MOBILE: 1,
  PRO: 2,
  ENTERPRISE: 3,
  SCALE: 4,
  TESTER: 99, // Special tier, always highest
};

/**
 * Fallback prices for mobile IAP when RevenueCat offerings fail to load.
 * These should match the prices configured in App Store Connect / Google Play Console.
 */
export const MOBILE_IAP_PRICES: Record<string, string> = {
  MOBILE: '$7.99/mo',
  PRO: '$54.99/mo',
  ENTERPRISE: '$139.99/mo',
  SCALE: '$349.99/mo',
};

/**
 * UI copy for mobile plan cards — feature bullet points per tier.
 * Used in the Plans screen and paywall components.
 */
/**
 * Icon names (lucide-react-native) for each feature per tier.
 * Keyed by feature text to pair with MOBILE_IAP_FEATURES.
 */
export const MOBILE_IAP_FEATURE_ICONS: Record<string, Record<string, string>> = {
  MOBILE: {
    '10 quick validation cards/month': 'Zap',
    'AI-powered idea refinement': 'Sparkles',
    'Voice & text capture': 'Mic',
  },
  PRO: {
    'Everything in Mobile': 'ChevronUp',
    '5 Spark reports': 'FileText',
    '3 Light interview reports': 'Users',
    '1 In-Depth deep dive': 'Search',
    '10 financial models': 'BarChart3',
    'Full research pipeline': 'Rocket',
  },
  ENTERPRISE: {
    'Everything in Pro': 'ChevronUp',
    '10 Spark reports': 'FileText',
    '5 Light interview reports': 'Users',
    '2 In-Depth deep dives': 'Search',
    '50 financial models': 'BarChart3',
    'Priority support': 'Shield',
  },
  SCALE: {
    'Everything in Enterprise': 'ChevronUp',
    'Expand pipeline access': 'Rocket',
    '100 financial models': 'BarChart3',
    'Adjacency scan & competitor portfolio': 'Monitor',
    'Demand mining & pricing ceiling': 'TrendingUp',
    'Opportunity scorecard': 'Award',
  },
};

export const MOBILE_IAP_FEATURES: Record<string, string[]> = {
  MOBILE: [
    '10 quick validation cards/month',
    'AI-powered idea refinement',
    'Voice & text capture',
  ],
  PRO: [
    'Everything in Mobile',
    '5 Spark reports',
    '3 Light interview reports',
    '1 In-Depth deep dive',
    '10 financial models',
    'Full research pipeline',
  ],
  ENTERPRISE: [
    'Everything in Pro',
    '10 Spark reports',
    '5 Light interview reports',
    '2 In-Depth deep dives',
    '50 financial models',
    'Priority support',
  ],
  SCALE: [
    'Everything in Enterprise',
    'Expand pipeline access',
    '100 financial models',
    'Adjacency scan & competitor portfolio',
    'Demand mining & pricing ceiling',
    'Opportunity scorecard',
  ],
};

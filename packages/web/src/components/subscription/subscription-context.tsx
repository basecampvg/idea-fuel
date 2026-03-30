'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { SubscriptionTier, InterviewMode, ReportTier } from '@forge/shared';
import {
  type SubscriptionFeatures,
  type UpgradeReason,
  SUBSCRIPTION_FEATURES,
  canAccessInterviewMode,
  canAccessReportTier as checkReportTierAccess,
  canCreateReport as checkCanCreateReport,
  getReportsRemaining,
} from '@forge/shared';

interface SubscriptionContextValue {
  // Current subscription state
  tier: SubscriptionTier;
  features: SubscriptionFeatures;
  isLoading: boolean;

  // Stripe billing state
  stripeCurrentPeriodEnd: Date | null;
  isSubscribed: boolean;

  // Convenience check methods
  canAccessMode: (mode: InterviewMode) => boolean;
  canCreateReport: (mode: InterviewMode, currentModeCount: number) => boolean;
  canAccessReportTier: (tier: ReportTier) => boolean;

  // Upgrade modal controls
  showUpgradePrompt: (reason: UpgradeReason) => void;
  hideUpgradePrompt: () => void;
  upgradeReason: UpgradeReason | null;
  isUpgradeModalOpen: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  // Upgrade modal state
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Fetch subscription data
  const { data: subscriptionData, isLoading: subLoading } = trpc.user.subscription.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: 1,
    }
  );

  // Fetch Stripe billing status
  const { data: billingData, isLoading: billingLoading } = trpc.billing.getSubscriptionStatus.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: 1,
    }
  );

  const isLoading = subLoading || billingLoading;

  // Derive values from fetched data
  // Override tier via NEXT_PUBLIC_FORCE_TIER env var for testing (e.g. NEXT_PUBLIC_FORCE_TIER=ENTERPRISE)
  const forceTier = process.env.NEXT_PUBLIC_FORCE_TIER as SubscriptionTier | undefined;
  const tier: SubscriptionTier = forceTier || (subscriptionData?.tier ?? 'FREE');
  const isSuperAdmin = subscriptionData?.isSuperAdmin ?? false;
  const features: SubscriptionFeatures = SUBSCRIPTION_FEATURES[tier];

  // Stripe billing state
  const stripeCurrentPeriodEnd = billingData?.stripeCurrentPeriodEnd
    ? new Date(billingData.stripeCurrentPeriodEnd)
    : null;
  const isSubscribed = billingData?.isSubscribed ?? false;

  // Check methods using shared helpers — SUPER_ADMIN bypasses all limits
  const canAccessMode = useCallback(
    (mode: InterviewMode) => isSuperAdmin || canAccessInterviewMode(tier, mode),
    [tier, isSuperAdmin]
  );

  const canCreateReportCheck = useCallback(
    (mode: InterviewMode, currentModeCount: number) => isSuperAdmin || checkCanCreateReport(tier, mode, currentModeCount),
    [tier, isSuperAdmin]
  );

  const canAccessReportTierCheck = useCallback(
    (reportTier: ReportTier) => isSuperAdmin || checkReportTierAccess(tier, reportTier),
    [tier, isSuperAdmin]
  );

  // Modal control methods
  const showUpgradePrompt = useCallback((reason: UpgradeReason) => {
    setUpgradeReason(reason);
    setIsUpgradeModalOpen(true);
  }, []);

  const hideUpgradePrompt = useCallback(() => {
    setIsUpgradeModalOpen(false);
    // Delay clearing reason to allow exit animation
    setTimeout(() => setUpgradeReason(null), 200);
  }, []);

  const value: SubscriptionContextValue = {
    tier,
    features,
    isLoading,
    stripeCurrentPeriodEnd,
    isSubscribed,
    canAccessMode,
    canCreateReport: canCreateReportCheck,
    canAccessReportTier: canAccessReportTierCheck,
    showUpgradePrompt,
    hideUpgradePrompt,
    upgradeReason,
    isUpgradeModalOpen,
  };

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { RefreshCw, ExternalLink, Crown } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '../../../lib/trpc';
import { useToast } from '../../../contexts/ToastContext';
import { triggerHaptic } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { PlanCard } from '../../../components/ui/PlanCard';
import type { PlanCardState } from '../../../components/ui/PlanCard';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isPurchasesAvailable,
} from '../../../lib/purchases';
import {
  TIER_RANK,
  MOBILE_IAP_PRICES,
  MOBILE_IAP_FEATURES,
} from '@forge/shared';
import type { SubscriptionTier } from '@forge/shared';
import { colors, fonts } from '../../../lib/theme';

// The 4 purchasable tiers in display order
const PURCHASABLE_TIERS: { key: SubscriptionTier; name: string; rcProductSuffix: string }[] = [
  { key: 'MOBILE', name: 'Mobile', rcProductSuffix: 'ideafuel_mobile_monthly' },
  { key: 'PRO', name: 'Pro', rcProductSuffix: 'ideafuel_pro_monthly' },
  { key: 'ENTERPRISE', name: 'Enterprise', rcProductSuffix: 'ideafuel_enterprise_monthly' },
  { key: 'SCALE', name: 'Scale', rcProductSuffix: 'ideafuel_scale_monthly' },
];

const TIER_BADGE_VARIANT: Record<string, 'default' | 'success' | 'primary' | 'accent' | 'info' | 'warning'> = {
  FREE: 'default',
  MOBILE: 'primary',
  PRO: 'accent',
  ENTERPRISE: 'info',
  SCALE: 'warning',
  TESTER: 'success',
};

export default function PlansScreen() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = trpc.user.me.useQuery();

  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [offeringsLoaded, setOfferingsLoaded] = useState(false);

  // Load offerings on mount
  React.useEffect(() => {
    async function loadOfferings() {
      const result = await getOfferings();
      if (result) {
        setOfferings(result);
      }
      setOfferingsLoaded(true);
    }
    loadOfferings();
  }, []);

  const currentTier = (user?.subscription as SubscriptionTier) ?? 'FREE';
  const currentTierRank = TIER_RANK[currentTier] ?? 0;
  const isStripeSubscriber = !!user?.stripeSubscriptionId;

  // Get price from offerings or fallback
  const getPrice = useCallback(
    (tierKey: string, rcProductSuffix: string): string => {
      if (offerings?.current?.availablePackages) {
        const pkg = offerings.current.availablePackages.find(
          (p: any) => p.product?.identifier === rcProductSuffix,
        );
        if (pkg?.product?.priceString) {
          return `${pkg.product.priceString}/mo`;
        }
      }
      return MOBILE_IAP_PRICES[tierKey] ?? '';
    },
    [offerings],
  );

  // Get RevenueCat package for a product suffix
  const getPackage = useCallback(
    (rcProductSuffix: string) => {
      if (!offerings?.current?.availablePackages) return null;
      return (
        offerings.current.availablePackages.find(
          (p: any) => p.product?.identifier === rcProductSuffix,
        ) ?? null
      );
    },
    [offerings],
  );

  // Determine card state for each tier
  const getCardState = useCallback(
    (tierKey: SubscriptionTier): PlanCardState => {
      if (purchasingTier === tierKey) return 'loading';
      if (isStripeSubscriber) return 'web-active';
      if (tierKey === currentTier) return 'current';
      const tierRank = TIER_RANK[tierKey] ?? 0;
      if (tierRank <= currentTierRank && currentTier !== 'FREE') return 'lower-tier';
      return 'available';
    },
    [currentTier, currentTierRank, isStripeSubscriber, purchasingTier],
  );

  // Handle purchase
  const handleSubscribe = useCallback(
    async (tierKey: string, rcProductSuffix: string) => {
      const pkg = getPackage(rcProductSuffix);
      if (!pkg) {
        showToast({ message: 'Package not available. Try again later.', type: 'error' });
        return;
      }

      setPurchasingTier(tierKey);
      try {
        await purchasePackage(pkg);
        triggerHaptic('success');
        showToast({ message: 'Subscription activated!', type: 'success' });
        // Invalidate user query so UI updates with new tier
        queryClient.invalidateQueries({ queryKey: [['user', 'me']] });
      } catch (error: any) {
        if (error?.cancelled) {
          // User cancelled — do nothing
        } else {
          triggerHaptic('error');
          showToast({ message: 'Payment failed. Please try again.', type: 'error' });
        }
      } finally {
        setPurchasingTier(null);
      }
    },
    [getPackage, showToast, queryClient],
  );

  // Handle restore
  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
      triggerHaptic('success');
      showToast({ message: 'Purchases restored', type: 'success' });
      queryClient.invalidateQueries({ queryKey: [['user', 'me']] });
    } catch {
      triggerHaptic('error');
      showToast({ message: 'Could not restore purchases', type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  }, [showToast, queryClient]);

  // Handle manage subscription deep link
  const handleManageSubscription = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('itms-apps://apps.apple.com/account/subscriptions').catch(() => {
        Linking.openURL('https://apps.apple.com/account/subscriptions');
      });
    } else {
      Linking.openURL(
        'https://play.google.com/store/account/subscriptions',
      );
    }
  }, []);

  // Format period end date
  const periodEndLabel = useMemo(() => {
    if (!user?.stripeCurrentPeriodEnd) return null;
    const date = new Date(user.stripeCurrentPeriodEnd);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [user?.stripeCurrentPeriodEnd]);

  if (userLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  const tierLabel =
    currentTier === 'FREE'
      ? 'Free'
      : currentTier === 'MOBILE'
        ? 'Mobile'
        : currentTier === 'PRO'
          ? 'Pro'
          : currentTier === 'ENTERPRISE'
            ? 'Enterprise'
            : currentTier === 'SCALE'
              ? 'Scale'
              : currentTier === 'TESTER'
                ? 'Tester'
                : currentTier;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan Header */}
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanRow}>
            <Crown size={20} color={colors.brand} />
            <Text style={styles.currentPlanLabel}>Current Plan</Text>
          </View>
          <View style={styles.currentPlanDetails}>
            <Text style={styles.currentPlanTier}>{tierLabel}</Text>
            <Badge variant={TIER_BADGE_VARIANT[currentTier] || 'default'}>
              {isStripeSubscriber ? 'Web' : 'Active'}
            </Badge>
          </View>
          {periodEndLabel && (
            <Text style={styles.periodEnd}>
              {isStripeSubscriber ? 'Managed on web' : `Renews ${periodEndLabel}`}
            </Text>
          )}
        </View>

        {/* Plan Cards */}
        <View style={styles.plansSection}>
          {PURCHASABLE_TIERS.map((tier, index) => (
            <PlanCard
              key={tier.key}
              tierKey={tier.key}
              tierName={tier.name}
              price={getPrice(tier.key, tier.rcProductSuffix)}
              features={MOBILE_IAP_FEATURES[tier.key] ?? []}
              state={getCardState(tier.key)}
              index={index}
              onSubscribe={() => handleSubscribe(tier.key, tier.rcProductSuffix)}
            />
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {/* Restore Purchases */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleRestore}
            disabled={isRestoring}
            activeOpacity={0.7}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : (
              <RefreshCw size={16} color={colors.muted} />
            )}
            <Text style={styles.actionText}>Restore Purchases</Text>
          </TouchableOpacity>

          {/* Manage Subscription */}
          {currentTier !== 'FREE' && !isStripeSubscriber && (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleManageSubscription}
              activeOpacity={0.7}
            >
              <ExternalLink size={16} color={colors.muted} />
              <Text style={styles.actionText}>Manage Subscription</Text>
            </TouchableOpacity>
          )}

          {/* Manage on Web for Stripe subscribers */}
          {isStripeSubscriber && (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => Linking.openURL('https://app.ideafuel.ai/settings')}
              activeOpacity={0.7}
            >
              <ExternalLink size={16} color={colors.muted} />
              <Text style={styles.actionText}>Manage on Web</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SDK unavailable notice */}
        {!isPurchasesAvailable() && offeringsLoaded && (
          <View style={styles.devNotice}>
            <Text style={styles.devNoticeText}>
              In-app purchases are unavailable in this build. Use a dev build or TestFlight to test purchases.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: colors.muted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  // Current plan header card
  currentPlanCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  currentPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentPlanLabel: {
    fontSize: 13,
    fontFamily: fonts.geist.medium,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentPlanDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentPlanTier: {
    fontSize: 24,
    fontFamily: fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  periodEnd: {
    fontSize: 13,
    fontFamily: fonts.geist.regular,
    color: colors.muted,
  },
  // Plans
  plansSection: {
    gap: 14,
  },
  // Action links
  actionsSection: {
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  actionText: {
    fontSize: 14,
    fontFamily: fonts.geist.medium,
    color: colors.muted,
  },
  // Dev notice
  devNotice: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  devNoticeText: {
    fontSize: 12,
    fontFamily: fonts.geist.regular,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

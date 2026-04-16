import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '../../lib/trpc';
import { useToast } from '../../contexts/ToastContext';
import { triggerHaptic, Button } from '../../components/ui/Button';
import { PlanCard, TIER_COLORS } from '../../components/ui/PlanCard';
import type { PlanCardState } from '../../components/ui/PlanCard';
import { PlanPager } from '../../components/ui/PlanPager';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isPurchasesAvailable,
} from '../../lib/purchases';
import {
  TIER_RANK,
  MOBILE_IAP_PRICES,
  MOBILE_IAP_FEATURES,
  MOBILE_IAP_FEATURE_ICONS,
} from '@forge/shared';
import type { SubscriptionTier } from '@forge/shared';
import { colors, fonts } from '../../lib/theme';

const PURCHASABLE_TIERS: { key: SubscriptionTier; name: string; rcProductSuffix: string; tagline: string }[] = [
  { key: 'MOBILE', name: 'Mobile', rcProductSuffix: 'ideafuel_mobile_monthly', tagline: 'Quick idea validation on the go' },
  { key: 'PRO', name: 'Pro', rcProductSuffix: 'ideafuel_pro_monthly', tagline: 'Full research pipeline & reports' },
  { key: 'ENTERPRISE', name: 'Enterprise', rcProductSuffix: 'ideafuel_enterprise_monthly', tagline: 'Expanded limits & priority support' },
  { key: 'SCALE', name: 'Scale', rcProductSuffix: 'ideafuel_agency_monthly', tagline: 'Agency-grade tools & advanced analysis' },
];

export default function PlansScreen() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = trpc.user.me.useQuery();

  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [offeringsLoaded, setOfferingsLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

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

  // Determine initial page: next tier up, or current tier if subscribed
  const initialIndex = useMemo(() => {
    if (currentTier === 'FREE') return 0;
    const idx = PURCHASABLE_TIERS.findIndex((t) => t.key === currentTier);
    if (idx >= 0) return Math.min(idx + 1, PURCHASABLE_TIERS.length - 1);
    return 0;
  }, [currentTier]);

  // Set active index to initial on first load
  React.useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

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

  // Tiers that aren't available for purchase yet (web app not ready)
  const COMING_SOON_TIERS = new Set<SubscriptionTier>(['PRO', 'ENTERPRISE', 'SCALE']);

  // Determine card state for each tier
  const getCardState = useCallback(
    (tierKey: SubscriptionTier): PlanCardState => {
      if (purchasingTier === tierKey) return 'loading';
      if (isStripeSubscriber) return 'web-active';
      if (tierKey === currentTier) return 'current';
      if (COMING_SOON_TIERS.has(tierKey)) return 'coming-soon';
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
        queryClient.invalidateQueries({ queryKey: [['user', 'me']] });
      } catch (error: any) {
        if (error?.cancelled) {
          // User cancelled
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
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  }, []);

  // Active tier data
  const activeTier = PURCHASABLE_TIERS[activeIndex];
  const activeTierState = activeTier ? getCardState(activeTier.key) : 'available';
  const activeTierPrice = activeTier ? getPrice(activeTier.key, activeTier.rcProductSuffix) : '';
  const isPurchasing = purchasingTier === activeTier?.key;

  // Tier colors for dot indicators
  const tierColors = PURCHASABLE_TIERS.map((t) => TIER_COLORS[t.key] || colors.brand);

  // Current plan label
  const tierLabel = currentTier === 'FREE' ? 'Free' :
    PURCHASABLE_TIERS.find((t) => t.key === currentTier)?.name || currentTier;

  if (userLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </View>
    );
  }

  // CTA button config based on active tier state
  const ctaConfig = (() => {
    switch (activeTierState) {
      case 'current':
        return { label: 'Current Plan', variant: 'outline' as const, disabled: true };
      case 'web-active':
        return { label: 'Manage on Web', variant: 'outline' as const, disabled: false };
      case 'lower-tier':
        return { label: 'Included in your plan', variant: 'ghost' as const, disabled: true };
      case 'coming-soon':
        return { label: 'Coming Soon', variant: 'outline' as const, disabled: true };
      case 'loading':
        return { label: 'Processing...', variant: 'primary' as const, disabled: true };
      default:
        return { label: `Subscribe to ${activeTier?.name} — ${activeTierPrice}`, variant: 'primary' as const, disabled: false };
    }
  })();

  const handleCtaPress = () => {
    if (activeTierState === 'web-active') {
      Linking.openURL('https://app.ideafuel.ai/settings');
    } else if (activeTierState === 'available' && activeTier) {
      handleSubscribe(activeTier.key, activeTier.rcProductSuffix);
    }
  };

  return (
    <View style={styles.container}>
      {/* Current plan indicator */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.currentPlanRow}>
        <View style={[styles.currentPlanDot, { backgroundColor: TIER_COLORS[currentTier] || colors.muted }]} />
        <Text style={styles.currentPlanText}>
          {currentTier === 'FREE' ? 'Free plan · Upgrade for more' : `You're on ${tierLabel}`}
        </Text>
      </Animated.View>

      {/* Plan Pager */}
      <PlanPager
        data={PURCHASABLE_TIERS}
        tierColors={tierColors}
        initialIndex={initialIndex}
        onActiveIndexChange={setActiveIndex}
        renderItem={(tier) => (
          <PlanCard
            tierKey={tier.key}
            tierName={tier.name}
            price={getPrice(tier.key, tier.rcProductSuffix)}
            tagline={tier.tagline}
            features={MOBILE_IAP_FEATURES[tier.key] ?? []}
            featureIcons={MOBILE_IAP_FEATURE_ICONS[tier.key] ?? {}}
            state={getCardState(tier.key)}
          />
        )}
      />

      {/* Sticky bottom section */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.bottomSection}>
        {/* Cancel anytime */}
        <Text style={styles.reassurance}>Cancel anytime</Text>

        {/* CTA Button */}
        <Button
          variant={ctaConfig.variant}
          size="lg"
          disabled={ctaConfig.disabled || isPurchasing}
          isLoading={isPurchasing}
          onPress={handleCtaPress}
          style={styles.ctaButton}
          haptic="medium"
        >
          {ctaConfig.label}
        </Button>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleRestore} disabled={isRestoring} activeOpacity={0.7}>
            <Text style={styles.footerLink}>
              {isRestoring ? 'Restoring...' : 'Restore'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerDivider}>·</Text>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://ideafuel.ai/terms')}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>

          <Text style={styles.footerDivider}>·</Text>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://ideafuel.ai/privacy')}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>

          {currentTier !== 'FREE' && !isStripeSubscriber && (
            <>
              <Text style={styles.footerDivider}>·</Text>
              <TouchableOpacity onPress={handleManageSubscription} activeOpacity={0.7}>
                <Text style={styles.footerLink}>Manage</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* SDK unavailable notice */}
        {!isPurchasesAvailable() && offeringsLoaded && (
          <Text style={styles.devNotice}>
            Purchases unavailable in this build. Use TestFlight to test.
          </Text>
        )}
      </Animated.View>
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
  },
  // Current plan indicator
  currentPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  currentPlanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  currentPlanText: {
    fontSize: 14,
    ...fonts.geist.medium,
    color: colors.muted,
  },
  // Sticky bottom
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    gap: 12,
    alignItems: 'center',
  },
  reassurance: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.mutedDim,
  },
  ctaButton: {
    width: '100%',
  },
  // Footer links
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 4,
  },
  footerLink: {
    fontSize: 13,
    ...fonts.geist.medium,
    color: colors.muted,
  },
  footerDivider: {
    fontSize: 13,
    color: colors.mutedDim,
  },
  devNotice: {
    fontSize: 11,
    ...fonts.geist.regular,
    color: colors.mutedDim,
    textAlign: 'center',
    paddingTop: 4,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, triggerHaptic } from './Button';
import { PlanFeatureRow } from './PlanFeatureRow';
import { useToast } from '../../contexts/ToastContext';
import {
  getOfferings,
  purchasePackage,
  isPurchasesAvailable,
} from '../../lib/purchases';
import { MOBILE_IAP_PRICES, MOBILE_IAP_FEATURES, MOBILE_IAP_FEATURE_ICONS } from '@forge/shared';
import { colors, fonts } from '../../lib/theme';

interface PaywallProps {
  /** If true, renders in compact mode suitable for BottomSheet */
  compact?: boolean;
  /** Called after a successful purchase so the parent can dismiss */
  onPurchaseSuccess?: () => void;
}

export function Paywall({ compact = false, onPurchaseSuccess }: PaywallProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [mobilePackage, setMobilePackage] = useState<any>(null);
  const [priceLabel, setPriceLabel] = useState(MOBILE_IAP_PRICES.MOBILE || '$7.99/mo');

  // Load the MOBILE package from RevenueCat offerings
  useEffect(() => {
    async function loadMobilePackage() {
      const offerings = await getOfferings();
      if (offerings?.current?.availablePackages) {
        const pkg = offerings.current.availablePackages.find(
          (p: any) => p.product?.identifier === 'ideafuel_mobile_monthly',
        );
        if (pkg) {
          setMobilePackage(pkg);
          if (pkg.product?.priceString) {
            setPriceLabel(`${pkg.product.priceString}/mo`);
          }
        }
      }
    }
    loadMobilePackage();
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!isPurchasesAvailable()) {
      showToast({
        message: 'Purchases unavailable in this build',
        type: 'info',
      });
      return;
    }

    if (!mobilePackage) {
      showToast({
        message: 'Loading plans... try again in a moment',
        type: 'info',
      });
      return;
    }

    setIsPurchasing(true);
    try {
      await purchasePackage(mobilePackage);
      triggerHaptic('success');
      showToast({ message: 'Subscription activated!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: [['user', 'me']] });
      onPurchaseSuccess?.();
    } catch (error: any) {
      if (error?.cancelled) {
        // User dismissed the payment sheet — just close loading
      } else {
        triggerHaptic('error');
        showToast({ message: 'Payment failed. Please try again.', type: 'error' });
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [mobilePackage, showToast, queryClient, onPurchaseSuccess]);

  const handleSeeAllPlans = useCallback(() => {
    triggerHaptic('light');
    router.push('/(tabs)/settings/plans' as any);
  }, [router]);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Icon */}
      <View style={styles.iconWrapper}>
        <Sparkles size={32} color={colors.brand} />
      </View>

      {/* Heading */}
      <Text style={styles.heading}>Want more validations?</Text>

      {/* Subtext */}
      <Text style={styles.subtext}>
        Your free validation has been used. Subscribe for more.
      </Text>

      {/* Feature list with icons */}
      <View style={styles.featureList}>
        {(MOBILE_IAP_FEATURES.MOBILE ?? []).map((feature, i) => (
          <PlanFeatureRow
            key={i}
            text={feature}
            iconName={MOBILE_IAP_FEATURE_ICONS.MOBILE?.[feature]}
            accentColor={colors.brand}
            index={i}
          />
        ))}
      </View>

      {/* Tier preview pills */}
      <View style={styles.tierPills}>
        {(['Pro', 'Enterprise', 'Scale'] as const).map((name) => (
          <TouchableOpacity
            key={name}
            style={styles.tierPill}
            onPress={handleSeeAllPlans}
            activeOpacity={0.7}
          >
            <Text style={styles.tierPillText}>{name}</Text>
          </TouchableOpacity>
        ))}
        <ChevronRight size={14} color={colors.mutedDim} />
      </View>

      {/* Buttons */}
      <View style={styles.buttonGroup}>
        <Button
          variant="primary"
          size="lg"
          onPress={handleSubscribe}
          isLoading={isPurchasing}
          disabled={isPurchasing}
          style={styles.fullWidth}
        >
          {`Subscribe to Mobile — ${priceLabel}`}
        </Button>

        <Button
          variant="ghost"
          size="md"
          onPress={handleSeeAllPlans}
          rightIcon={<ChevronRight size={16} color={colors.muted} />}
          style={styles.fullWidth}
        >
          See All Plans
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  containerCompact: {
    flex: 0,
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 16,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heading: {
    fontSize: 22,
    ...fonts.outfit.bold,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtext: {
    fontSize: 14,
    ...fonts.geist.regular,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  featureList: {
    width: '100%',
    gap: 0,
    paddingHorizontal: 4,
  },
  tierPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierPill: {
    backgroundColor: colors.surface,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tierPillText: {
    fontSize: 12,
    ...fonts.geist.medium,
    color: colors.muted,
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  fullWidth: {
    width: '100%',
  },
});

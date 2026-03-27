import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, Globe } from 'lucide-react-native';
import { Button } from './Button';
import { Badge } from './Badge';
import { colors, fonts } from '../../lib/theme';
import type { SubscriptionTier } from '@forge/shared';

export type PlanCardState =
  | 'available'    // user can subscribe
  | 'current'      // user is on this plan
  | 'web-active'   // user has this tier via Stripe
  | 'lower-tier'   // tier is below user's current
  | 'loading';     // purchase in progress

interface PlanCardProps {
  tierKey: string;
  tierName: string;
  price: string;
  features: string[];
  state: PlanCardState;
  index: number;
  onSubscribe?: () => void;
}

const TIER_COLORS: Record<string, string> = {
  MOBILE: colors.brand,
  PRO: colors.accent,
  ENTERPRISE: '#8B5CF6', // violet
  SCALE: '#A855F7',      // purple
};

export function PlanCard({
  tierKey,
  tierName,
  price,
  features,
  state,
  index,
  onSubscribe,
}: PlanCardProps) {
  const accentColor = TIER_COLORS[tierKey] || colors.brand;
  const isDisabled = state === 'current' || state === 'web-active' || state === 'lower-tier' || state === 'loading';

  return (
    <Animated.View
      entering={FadeIn.delay(index * 80).duration(300)}
      style={[styles.card, { borderColor: state === 'current' ? accentColor : colors.border }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.tierName, { color: accentColor }]}>{tierName}</Text>
          {state === 'current' && (
            <Badge variant="success">Current Plan</Badge>
          )}
          {state === 'web-active' && (
            <Badge variant="info">Active via Web</Badge>
          )}
        </View>
        <Text style={styles.price}>{price}</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {features.map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <Check size={14} color={accentColor} style={styles.checkIcon} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Action */}
      <View style={styles.footer}>
        {state === 'web-active' ? (
          <View style={styles.webMessage}>
            <Globe size={14} color={colors.muted} />
            <Text style={styles.webMessageText}>Manage on ideafuel.ai</Text>
          </View>
        ) : state === 'loading' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={accentColor} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : (
          <Button
            variant={state === 'available' ? 'primary' : 'outline'}
            size="md"
            disabled={isDisabled}
            onPress={onSubscribe}
            style={styles.subscribeButton}
            haptic={state === 'available' ? 'medium' : 'none'}
          >
            {state === 'current'
              ? 'Current Plan'
              : state === 'lower-tier'
                ? 'Included'
                : `Subscribe to ${tierName}`}
          </Button>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tierName: {
    fontSize: 18,
    fontFamily: fonts.outfit.bold,
    letterSpacing: -0.3,
  },
  price: {
    fontSize: 16,
    fontFamily: fonts.mono.medium,
    color: colors.foreground,
  },
  features: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkIcon: {
    marginTop: 2,
  },
  featureText: {
    fontSize: 13,
    fontFamily: fonts.geist.regular,
    color: colors.muted,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    marginTop: 2,
  },
  subscribeButton: {
    width: '100%',
  },
  webMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  webMessageText: {
    fontSize: 13,
    fontFamily: fonts.geist.regular,
    color: colors.muted,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fonts.geist.regular,
    color: colors.muted,
  },
});

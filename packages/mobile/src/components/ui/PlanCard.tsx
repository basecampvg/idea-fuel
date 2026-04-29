import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe } from 'lucide-react-native';
import { Badge } from './Badge';
import { PlanFeatureRow } from './PlanFeatureRow';
import { colors, fonts } from '../../lib/theme';

export type PlanCardState =
  | 'available'    // user can subscribe
  | 'current'      // user is on this plan
  | 'web-active'   // user has this tier via Stripe
  | 'lower-tier'   // tier is below user's current
  | 'loading'      // purchase in progress
  | 'coming-soon'; // not yet available for purchase

interface PlanCardProps {
  tierKey: string;
  tierName: string;
  price: string;
  tagline: string;
  features: string[];
  featureIcons: Record<string, string>;
  state: PlanCardState;
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
  tagline,
  features,
  featureIcons,
  state,
}: PlanCardProps) {
  const accentColor = TIER_COLORS[tierKey] || colors.brand;
  const isLowerTier = state === 'lower-tier';
  const isComingSoon = state === 'coming-soon';

  // Current plan gets an accent-tinted gradient; others get standard glass
  const gradientColors: [string, string] = state === 'current'
    ? [`${accentColor}40`, `${accentColor}10`]
    : [colors.glassBorderStart, colors.glassBorderEnd];

  // Parse price into number and period
  const priceMatch = price.match(/^(\$[\d,.]+)(\/mo)?$/);
  const priceAmount = priceMatch?.[1] || price;
  const pricePeriod = priceMatch?.[2] ? ' / month' : '';

  return (
    <Animated.View
      entering={FadeIn.delay(150).duration(400)}
      style={[(isLowerTier || isComingSoon) && styles.dimmed]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={styles.card}>
          {/* Header: Tier name + badge */}
          <View style={styles.header}>
            <Text style={[styles.tierName, { color: accentColor }]}>{tierName}</Text>
            {state === 'current' && (
              <Badge variant="success">Current Plan</Badge>
            )}
            {state === 'web-active' && (
              <Badge variant="info">Active via Web</Badge>
            )}
            {isComingSoon && (
              <Badge variant="default">Coming Soon</Badge>
            )}
          </View>

          {/* Price block */}
          <View style={styles.priceBlock}>
            <Text style={styles.priceAmount}>{priceAmount}</Text>
            {pricePeriod ? (
              <Text style={styles.pricePeriod}>{pricePeriod}</Text>
            ) : null}
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>{tagline}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Features */}
          <View style={styles.features}>
            {features.map((feature, i) => (
              <PlanFeatureRow
                key={i}
                text={feature}
                iconName={featureIcons[feature]}
                accentColor={accentColor}
                index={i}
              />
            ))}
          </View>

          {/* Web-active message */}
          {state === 'web-active' && (
            <View style={styles.webMessage}>
              <Globe size={14} color={colors.muted} />
              <Text style={styles.webMessageText}>Manage on ideafuel.ai</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export { TIER_COLORS };

const styles = StyleSheet.create({
  gradientBorder: {
    borderRadius: 24,
    padding: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 23,
    padding: 24,
    gap: 4,
    overflow: 'hidden',
  },
  dimmed: {
    opacity: 0.55,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tierName: {
    fontSize: 22,
    ...fonts.outfit.bold,
    letterSpacing: -0.3,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceAmount: {
    fontSize: 44,
    ...fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -1.5,
  },
  pricePeriod: {
    fontSize: 15,
    ...fonts.geist.regular,
    color: colors.muted,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    ...fonts.geist.regular,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  features: {
    gap: 2,
  },
  webMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    paddingVertical: 8,
  },
  webMessageText: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
  },
});

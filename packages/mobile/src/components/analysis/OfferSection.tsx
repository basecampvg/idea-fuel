import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const colors = {
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
};

const TIER_COLORS: Record<string, { color: string; bg: string }> = {
  lead_magnet: { color: colors.primary, bg: colors.primaryMuted },
  frontend: { color: colors.accent, bg: colors.accentMuted },
  core: { color: colors.secondary, bg: colors.secondaryMuted },
  backend: { color: colors.warning, bg: colors.warningMuted },
};

interface OfferTier {
  tier: 'lead_magnet' | 'frontend' | 'core' | 'backend';
  label?: string;
  title: string;
  price?: string;
  description?: string;
}

interface OfferSectionProps {
  offerTiers?: OfferTier[] | null;
}

export function OfferSection({ offerTiers }: OfferSectionProps) {
  if (!offerTiers || offerTiers.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.warningMuted }]}>
          <Ionicons name="layers" size={20} color={colors.warning} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Value Ladder</Text>
          <Text style={styles.subtitle}>Product tier strategy</Text>
        </View>
      </View>

      <View style={styles.tiersList}>
        {offerTiers.map((tier, index) => {
          const tierStyle = TIER_COLORS[tier.tier] || TIER_COLORS.core;

          return (
            <View key={index} style={styles.tierRow}>
              <View style={[styles.tierNumber, { backgroundColor: tierStyle.bg }]}>
                <Text style={[styles.tierNumberText, { color: tierStyle.color }]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.tierContent}>
                <Text style={[styles.tierLabel, { color: tierStyle.color }]}>
                  {tier.label || tier.tier.replace('_', ' ').toUpperCase()}
                </Text>
                <View style={styles.tierTitleRow}>
                  <Text style={styles.tierTitle}>{tier.title}</Text>
                  {tier.price && (
                    <Text style={styles.tierPrice}>({tier.price})</Text>
                  )}
                </View>
                {tier.description && (
                  <Text style={styles.tierDescription} numberOfLines={2}>
                    {tier.description}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  tiersList: {
    gap: 16,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tierNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tierNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tierContent: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 2,
  },
  tierTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  tierPrice: {
    fontSize: 12,
    color: colors.muted,
  },
  tierDescription: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
});

export default OfferSection;

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { ProgressMeter } from '../ui/ProgressMeter';

const colors = {
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
  primary: '#E91E8C',
  accent: '#14B8A6',
};

interface WhyNowData {
  marketTriggers?: string[];
  timingFactors?: string[];
  urgencyScore?: number;
}

interface WhyNowSectionProps {
  whyNow?: WhyNowData | null;
}

export function WhyNowSection({ whyNow }: WhyNowSectionProps) {
  if (!whyNow) return null;

  const { marketTriggers, timingFactors, urgencyScore } = whyNow;
  const hasContent = (marketTriggers?.length || 0) > 0 || (timingFactors?.length || 0) > 0;

  if (!hasContent && urgencyScore === undefined) return null;

  return (
    <CollapsibleSection
      icon="flash"
      iconColor={colors.secondary}
      iconBgColor={colors.secondaryMuted}
      title="Why Now"
      subtitle="Market timing analysis"
      defaultCollapsed={true}
    >
      {/* Urgency Meter */}
      {urgencyScore !== undefined && (
        <View style={styles.urgencyContainer}>
          <ProgressMeter
            value={urgencyScore}
            label="Market Urgency"
            showValue={true}
            size="md"
          />
        </View>
      )}

      {/* Market Triggers */}
      {marketTriggers && marketTriggers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Market Triggers</Text>
          </View>
          {marketTriggers.map((trigger, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={[styles.listPrefix, { color: colors.primary }]}>→</Text>
              <Text style={styles.listText}>{trigger}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Timing Factors */}
      {timingFactors && timingFactors.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={16} color={colors.accent} />
            <Text style={styles.sectionTitle}>Timing Factors</Text>
          </View>
          {timingFactors.map((factor, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={[styles.listPrefix, { color: colors.accent }]}>●</Text>
              <Text style={styles.listText}>{factor}</Text>
            </View>
          ))}
        </View>
      )}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  urgencyContainer: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  listPrefix: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    width: 16,
  },
  listText: {
    flex: 1,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
});

export default WhyNowSection;

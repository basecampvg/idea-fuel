import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../ui/CollapsibleSection';

const colors = {
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  border: '#1F1E1C',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  success: '#22C55E',
  warning: '#F59E0B',
  destructive: '#EF4444',
};

interface PainPoint {
  problem: string;
  severity: 'high' | 'medium' | 'low';
  currentSolutions?: string[];
  gaps?: string[];
}

interface PainPointsSectionProps {
  painPoints?: PainPoint[] | null;
}

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { color: colors.destructive, bg: 'rgba(239, 68, 68, 0.15)' },
    medium: { color: colors.warning, bg: 'rgba(245, 158, 11, 0.15)' },
    low: { color: colors.success, bg: 'rgba(34, 197, 94, 0.15)' },
  };
  const { color, bg } = config[severity];

  return (
    <View style={[styles.severityBadge, { backgroundColor: bg }]}>
      <Text style={[styles.severityText, { color }]}>
        {severity.toUpperCase()}
      </Text>
    </View>
  );
}

function PainPointCard({ painPoint }: { painPoint: PainPoint }) {
  return (
    <View style={styles.painPointCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.problemText} numberOfLines={2}>{painPoint.problem}</Text>
        <SeverityBadge severity={painPoint.severity} />
      </View>

      {/* Current Solutions */}
      {painPoint.currentSolutions && painPoint.currentSolutions.length > 0 && (
        <View style={styles.solutionsContainer}>
          <Text style={styles.solutionsLabel}>Current Solutions</Text>
          <View style={styles.pillsRow}>
            {painPoint.currentSolutions.slice(0, 3).map((solution, i) => (
              <View key={i} style={styles.pill}>
                <Text style={styles.pillText} numberOfLines={1}>{solution}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Gaps */}
      {painPoint.gaps && painPoint.gaps.length > 0 && (
        <View style={styles.gapsContainer}>
          <Text style={styles.gapsLabel}>Solution Gaps</Text>
          {painPoint.gaps.slice(0, 3).map((gap, i) => (
            <View key={i} style={styles.gapItem}>
              <Text style={styles.gapArrow}>→</Text>
              <Text style={styles.gapText} numberOfLines={1}>{gap}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function PainPointsSection({ painPoints }: PainPointsSectionProps) {
  if (!painPoints || painPoints.length === 0) return null;

  // Sort by severity (high first)
  const sortedPainPoints = [...painPoints].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <CollapsibleSection
      icon="alert-circle"
      iconColor={colors.primary}
      iconBgColor={colors.primaryMuted}
      title="Pain Points"
      subtitle={`${painPoints.length} pain point${painPoints.length > 1 ? 's' : ''} identified`}
      defaultCollapsed={true}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedPainPoints.map((painPoint, index) => (
          <PainPointCard key={index} painPoint={painPoint} />
        ))}
      </ScrollView>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  painPointCard: {
    width: 260,
    backgroundColor: colors.mutedBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  problemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    lineHeight: 18,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  solutionsContainer: {
    marginBottom: 12,
  },
  solutionsLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    color: colors.muted,
  },
  gapsContainer: {},
  gapsLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  gapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  gapArrow: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
    width: 14,
  },
  gapText: {
    flex: 1,
    fontSize: 11,
    color: colors.warning,
    lineHeight: 14,
  },
});

export default PainPointsSection;

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../ui/CollapsibleSection';

const colors = {
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  success: '#22C55E',
  secondary: '#8B5CF6',
  destructive: '#EF4444',
};

interface ProofSignalsData {
  demandIndicators?: string[];
  validationOpportunities?: string[];
  riskFactors?: string[];
}

interface ProofSignalsSectionProps {
  proofSignals?: ProofSignalsData | null;
}

export function ProofSignalsSection({ proofSignals }: ProofSignalsSectionProps) {
  if (!proofSignals) return null;

  const { demandIndicators, validationOpportunities, riskFactors } = proofSignals;
  const hasContent =
    (demandIndicators?.length || 0) > 0 ||
    (validationOpportunities?.length || 0) > 0 ||
    (riskFactors?.length || 0) > 0;

  if (!hasContent) return null;

  return (
    <CollapsibleSection
      icon="pulse"
      iconColor={colors.accent}
      iconBgColor={colors.accentMuted}
      title="Proof Signals"
      subtitle="Demand validation evidence"
      defaultCollapsed={true}
    >
      {/* Demand Indicators */}
      {demandIndicators && demandIndicators.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.sectionTitle}>Demand Indicators</Text>
          </View>
          {demandIndicators.map((indicator, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={[styles.listPrefix, { color: colors.success }]}>✓</Text>
              <Text style={styles.listText}>{indicator}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Validation Opportunities */}
      {validationOpportunities && validationOpportunities.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={16} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Validation Opportunities</Text>
          </View>
          {validationOpportunities.map((opp, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={[styles.listPrefix, { color: colors.secondary }]}>★</Text>
              <Text style={styles.listText}>{opp}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Risk Factors */}
      {riskFactors && riskFactors.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={16} color={colors.destructive} />
            <Text style={styles.sectionTitle}>Risk Factors</Text>
          </View>
          {riskFactors.map((risk, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={[styles.listPrefix, { color: colors.destructive }]}>⚠</Text>
              <Text style={styles.listText}>{risk}</Text>
            </View>
          ))}
        </View>
      )}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
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

export default ProofSignalsSection;

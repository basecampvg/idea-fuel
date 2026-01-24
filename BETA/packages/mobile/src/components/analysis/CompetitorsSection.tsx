import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../ui/CollapsibleSection';

const colors = {
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  success: '#22C55E',
  destructive: '#EF4444',
};

interface Competitor {
  name: string;
  description?: string;
  strengths?: string[];
  weaknesses?: string[];
  positioning?: string;
  website?: string;
  pricing_model?: string;
}

interface CompetitorsSectionProps {
  competitors?: Competitor[] | null;
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  return (
    <View style={styles.competitorCard}>
      <Text style={styles.competitorName}>{competitor.name}</Text>
      {competitor.description && (
        <Text style={styles.competitorDescription} numberOfLines={2}>
          {competitor.description}
        </Text>
      )}
      {competitor.positioning && (
        <Text style={styles.competitorPositioning} numberOfLines={1}>
          "{competitor.positioning}"
        </Text>
      )}

      <View style={styles.listsContainer}>
        {/* Strengths */}
        {competitor.strengths && competitor.strengths.length > 0 && (
          <View style={styles.listColumn}>
            <Text style={[styles.listLabel, { color: colors.success }]}>Strengths</Text>
            {competitor.strengths.slice(0, 3).map((strength, i) => (
              <View key={i} style={styles.listItem}>
                <Ionicons name="add-circle" size={12} color={colors.success} />
                <Text style={styles.listItemText} numberOfLines={1}>{strength}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Weaknesses */}
        {competitor.weaknesses && competitor.weaknesses.length > 0 && (
          <View style={styles.listColumn}>
            <Text style={[styles.listLabel, { color: colors.destructive }]}>Weaknesses</Text>
            {competitor.weaknesses.slice(0, 3).map((weakness, i) => (
              <View key={i} style={styles.listItem}>
                <Ionicons name="remove-circle" size={12} color={colors.destructive} />
                <Text style={styles.listItemText} numberOfLines={1}>{weakness}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export function CompetitorsSection({ competitors }: CompetitorsSectionProps) {
  if (!competitors || competitors.length === 0) return null;

  return (
    <CollapsibleSection
      icon="people"
      iconColor={colors.accent}
      iconBgColor={colors.accentMuted}
      title="Competitors"
      subtitle={`${competitors.length} competitor${competitors.length > 1 ? 's' : ''} identified`}
      defaultCollapsed={true}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {competitors.map((competitor, index) => (
          <CompetitorCard key={index} competitor={competitor} />
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
  competitorCard: {
    width: 260,
    backgroundColor: colors.mutedBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  competitorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  competitorDescription: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
    marginBottom: 6,
  },
  competitorPositioning: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  listsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  listColumn: {
    flex: 1,
  },
  listLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  listItemText: {
    flex: 1,
    fontSize: 11,
    color: colors.muted,
  },
});

export default CompetitorsSection;

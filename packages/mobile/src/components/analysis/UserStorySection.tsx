import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const colors = {
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
  success: '#22C55E',
};

interface UserStoryData {
  scenario?: string;
  protagonist?: string;
  problem?: string;
  solution?: string;
  outcome?: string;
}

interface UserStorySectionProps {
  userStory?: UserStoryData | null;
}

export function UserStorySection({ userStory }: UserStorySectionProps) {
  if (!userStory) return null;

  const { scenario, protagonist, problem, solution, outcome } = userStory;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.secondaryMuted }]}>
          <Ionicons name="book" size={20} color={colors.secondary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>The Story</Text>
          <Text style={styles.subtitle}>Your user's journey</Text>
        </View>
      </View>

      {/* Narrative */}
      {scenario && (
        <View style={styles.narrativeContainer}>
          <Text style={styles.narrativeText}>{scenario}</Text>
        </View>
      )}

      {/* Details Grid */}
      <View style={styles.detailsDivider} />
      <View style={styles.detailsGrid}>
        {protagonist && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>THE USER</Text>
            <Text style={styles.detailValue}>{protagonist}</Text>
          </View>
        )}
        {problem && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>THEIR PROBLEM</Text>
            <Text style={styles.detailValueMuted}>{problem}</Text>
          </View>
        )}
        {solution && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>THE SOLUTION</Text>
            <Text style={styles.detailValueMuted}>{solution}</Text>
          </View>
        )}
        {outcome && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>THE OUTCOME</Text>
            <Text style={[styles.detailValue, { color: colors.success }]}>{outcome}</Text>
          </View>
        )}
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
  narrativeContainer: {
    backgroundColor: colors.mutedBg,
    borderRadius: 12,
    padding: 16,
  },
  narrativeText: {
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 22,
    textAlign: 'center',
  },
  detailsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    width: '46%',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    lineHeight: 18,
  },
  detailValueMuted: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
});

export default UserStorySection;

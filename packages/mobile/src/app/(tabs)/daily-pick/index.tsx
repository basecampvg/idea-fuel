import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../../lib/trpc';
import { LoadingScreen } from '../../../components/ui';

// Forge Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  cardHover: '#222120',
  border: '#2A2928',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedDark: '#5A5855',
  primary: '#E91E8C',
  accent: '#14B8A6',
  secondary: '#8B5CF6',
  warning: '#F59E0B',
  blue: '#3B82F6',
  green: '#22C55E',
  red: '#EF4444',
};

const { width } = Dimensions.get('window');

export default function DailyPickScreen() {
  const router = useRouter();
  const { data, isLoading, error } = trpc.dailyPick.getToday.useQuery();

  if (isLoading) {
    return <LoadingScreen message="Loading today's pick..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.red} />
          <Text style={styles.errorText}>Failed to load: {error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="trending-up" size={64} color={colors.muted} />
          <Text style={styles.emptyTitle}>No Pick Today</Text>
          <Text style={styles.emptyText}>
            The daily trend pick job hasn&apos;t run yet. Check back later.
          </Text>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.push('/(tabs)/daily-pick/history' as any)}
          >
            <Text style={styles.historyButtonText}>View History</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { cluster, report } = data;
  const winnerReport = report as {
    one_line_thesis?: string;
    pain_point?: { who: string; problem_statement: string; why_now: string };
    suggested_angles?: Array<{ angle: string; rationale: string }>;
    next_step?: { recommended_mode: string; prompt_seed: string };
  } | null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with history link */}
        <View style={styles.headerRow}>
          <View />
          <TouchableOpacity
            style={styles.historyLink}
            onPress={() => router.push('/(tabs)/daily-pick/history' as any)}
          >
            <Text style={styles.historyLinkText}>History</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Main Pick Card */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{cluster.title}</Text>
              <Text style={styles.query}>{cluster.canonicalQuery}</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>
                {cluster.combinedScore.toFixed(1)}
              </Text>
            </View>
          </View>

          {/* Thesis */}
          {winnerReport?.one_line_thesis && (
            <View style={styles.thesisBox}>
              <Text style={styles.thesisText}>{winnerReport.one_line_thesis}</Text>
            </View>
          )}

          {/* Score Grid */}
          <View style={styles.scoreGrid}>
            <View style={styles.scoreItem}>
              <Ionicons name="trending-up" size={20} color={colors.green} />
              <Text style={styles.scoreLabel}>Growth</Text>
              <Text style={styles.scoreValue}>{cluster.growthScore}</Text>
            </View>
            <View style={styles.scoreItem}>
              <Ionicons name="cart" size={20} color={colors.blue} />
              <Text style={styles.scoreLabel}>Purchase</Text>
              <Text style={styles.scoreValue}>{cluster.purchaseProofScore}</Text>
            </View>
            <View style={styles.scoreItem}>
              <Ionicons name="flag" size={20} color={colors.warning} />
              <Text style={styles.scoreLabel}>Pain Point</Text>
              <Text style={styles.scoreValue}>{cluster.painPointScore}</Text>
            </View>
            <View style={styles.scoreItem}>
              <Ionicons name="warning" size={20} color={colors.red} />
              <Text style={styles.scoreLabel}>News Risk</Text>
              <Text style={styles.scoreValue}>
                {(cluster.newsSpikeRisk * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Pain Point */}
        {winnerReport?.pain_point && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Pain Point</Text>
            </View>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionLabel}>Who</Text>
              <Text style={styles.sectionValue}>{winnerReport.pain_point.who}</Text>
              <Text style={styles.sectionLabel}>Problem</Text>
              <Text style={styles.sectionValue}>
                {winnerReport.pain_point.problem_statement}
              </Text>
              <Text style={styles.sectionLabel}>Why Now</Text>
              <Text style={styles.sectionValue}>{winnerReport.pain_point.why_now}</Text>
            </View>
          </View>
        )}

        {/* Suggested Angles */}
        {winnerReport?.suggested_angles && winnerReport.suggested_angles.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={20} color={colors.warning} />
              <Text style={styles.sectionTitle}>Suggested Angles</Text>
            </View>
            <View style={styles.anglesContainer}>
              {winnerReport.suggested_angles.map((angle, i) => (
                <View key={i} style={styles.angleCard}>
                  <Text style={styles.angleTitle}>{angle.angle}</Text>
                  <Text style={styles.angleRationale}>{angle.rationale}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Next Step */}
        {winnerReport?.next_step && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="arrow-forward-circle" size={20} color={colors.accent} />
              <Text style={styles.sectionTitle}>Next Step</Text>
            </View>
            <View style={styles.nextStepContent}>
              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeText}>
                  {winnerReport.next_step.recommended_mode.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.promptSeed}>{winnerReport.next_step.prompt_seed}</Text>
            </View>
          </View>
        )}

        {/* Related Queries */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="search" size={20} color={colors.muted} />
            <Text style={styles.sectionTitle}>
              Related Queries ({(cluster.memberQueries as string[]).length})
            </Text>
          </View>
          <View style={styles.queriesContainer}>
            {(cluster.memberQueries as string[]).map((query, i) => (
              <View key={i} style={styles.queryChip}>
                <Text style={styles.queryChipText}>{query}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyLinkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  historyButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  mainCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
  },
  query: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  scoreBadge: {
    backgroundColor: colors.green + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreText: {
    color: colors.green,
    fontSize: 16,
    fontWeight: '700',
  },
  thesisBox: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  thesisText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  scoreItem: {
    width: (width - 56) / 2,
    backgroundColor: colors.cardHover,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 6,
  },
  scoreValue: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContent: {
    gap: 8,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  sectionValue: {
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 20,
  },
  anglesContainer: {
    gap: 10,
  },
  angleCard: {
    backgroundColor: colors.cardHover,
    borderRadius: 10,
    padding: 12,
  },
  angleTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  angleRationale: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  nextStepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modeBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeBadgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  promptSeed: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  queriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  queryChip: {
    backgroundColor: colors.cardHover,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  queryChipText: {
    color: colors.foreground,
    fontSize: 12,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
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
  primary: '#E91E8C',
  green: '#22C55E',
  blue: '#3B82F6',
};

export default function DailyPickHistoryScreen() {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = trpc.dailyPick.listHistory.useQuery({
    limit,
    offset,
  });

  if (isLoading && offset === 0) {
    return <LoadingScreen message="Loading history..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load: {error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { picks = [], total = 0, hasMore = false } = data || {};

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      year: date.getFullYear(),
    };
  };

  const renderItem = ({
    item,
  }: {
    item: (typeof picks)[0];
  }) => {
    const { day, month, year } = formatDate(item.dateLocal);

    return (
      <TouchableOpacity
        style={styles.pickCard}
        onPress={() =>
          router.push(`/(tabs)/daily-pick/${item.dateLocal}` as any)
        }
        activeOpacity={0.7}
      >
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
          <Text style={styles.dateYear}>{year}</Text>
        </View>
        <View style={styles.pickContent}>
          <Text style={styles.pickTitle} numberOfLines={1}>
            {item.winnerCluster.title}
          </Text>
          <Text style={styles.pickQuery} numberOfLines={1}>
            {item.winnerCluster.canonicalQuery}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: colors.green + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.green }]}>
                {item.winnerCluster.combinedScore.toFixed(1)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.blue + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.blue }]}>
                Growth: {item.winnerCluster.growthScore}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {picks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={colors.muted} />
          <Text style={styles.emptyTitle}>No History Yet</Text>
          <Text style={styles.emptyText}>
            Daily picks will appear here after running the trend pick job.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={picks}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />

          {/* Pagination */}
          {total > limit && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  offset === 0 && styles.pageButtonDisabled,
                ]}
                onPress={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={offset === 0 ? colors.muted : colors.foreground}
                />
                <Text
                  style={[
                    styles.pageButtonText,
                    offset === 0 && styles.pageButtonTextDisabled,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <Text style={styles.pageInfo}>
                {offset + 1}-{Math.min(offset + limit, total)} of {total}
              </Text>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  !hasMore && styles.pageButtonDisabled,
                ]}
                onPress={() => setOffset(offset + limit)}
                disabled={!hasMore}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    !hasMore && styles.pageButtonTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={!hasMore ? colors.muted : colors.foreground}
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  pickCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBox: {
    width: 50,
    alignItems: 'center',
    marginRight: 14,
  },
  dateDay: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '700',
  },
  dateMonth: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  dateYear: {
    color: colors.muted,
    fontSize: 10,
  },
  pickContent: {
    flex: 1,
  },
  pickTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
  },
  pickQuery: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '500',
  },
  pageButtonTextDisabled: {
    color: colors.muted,
  },
  pageInfo: {
    color: colors.muted,
    fontSize: 12,
  },
});

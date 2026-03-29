import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  CheckCircle,
  ChevronRight,
  Search,
  Archive,
  Lightbulb,
  CircleCheck,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Zap,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { triggerHaptic } from '../../../components/ui/Button';
import { trpc } from '../../../lib/trpc';
import { colors, fonts } from '../../../lib/theme';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getCardMeta(item: any) {
  const cardResult = item.cardResult as any;
  if (!cardResult) {
    return {
      verdict: null,
      icon: Lightbulb,
      iconColor: colors.brand,
      iconBg: colors.brandMuted,
      badgeLabel: 'Draft',
      badgeColor: colors.brand,
      badgeBg: colors.brandMuted,
      accentColor: null,
    };
  }
  const verdict = cardResult.verdict as 'proceed' | 'watchlist' | 'drop';
  if (verdict === 'proceed') {
    return {
      verdict,
      icon: CircleCheck,
      iconColor: colors.success,
      iconBg: 'rgba(34, 197, 94, 0.15)',
      badgeLabel: 'Proceed',
      badgeColor: colors.success,
      badgeBg: 'rgba(34, 197, 94, 0.15)',
      accentColor: colors.success,
      problemSeverity: cardResult.problemSeverity,
      marketSignal: cardResult.marketSignal,
      tamLow: cardResult.tamEstimate?.low,
    };
  }
  if (verdict === 'watchlist') {
    return {
      verdict,
      icon: Clock,
      iconColor: colors.warning,
      iconBg: 'rgba(245, 158, 11, 0.15)',
      badgeLabel: 'Watchlist',
      badgeColor: colors.warning,
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      accentColor: colors.warning,
      problemSeverity: cardResult.problemSeverity,
      marketSignal: cardResult.marketSignal,
      tamLow: cardResult.tamEstimate?.low,
    };
  }
  // drop
  return {
    verdict,
    icon: XCircle,
    iconColor: colors.destructive,
    iconBg: 'rgba(239, 68, 68, 0.15)',
    badgeLabel: 'Drop',
    badgeColor: colors.destructive,
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    accentColor: colors.destructive,
    problemSeverity: cardResult.problemSeverity,
    marketSignal: cardResult.marketSignal,
    tamLow: cardResult.tamEstimate?.low,
  };
}

function getMarketSignalLabel(signal: string) {
  switch (signal) {
    case 'rising': return { label: 'Rising', color: colors.success };
    case 'flat': return { label: 'Flat', color: colors.muted };
    case 'declining': return { label: 'Declining', color: colors.destructive };
    default: return { label: 'Unknown', color: colors.mutedDim };
  }
}

export default function VaultScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = trpc.project.list.useQuery({});
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const utils = trpc.useUtils();

  // Refetch when screen gains focus (e.g. returning from validate/card screens)
  // Use invalidate() so it refetches in the background without triggering RefreshControl
  useFocusEffect(
    useCallback(() => {
      utils.project.list.invalidate();
    }, [utils])
  );

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refetch]);
  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.project.list.invalidate();
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to delete idea. Please try again.');
    },
  });

  const items = useMemo(() => {
    const projects = data?.items ?? [];
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter((p) =>
      p.title.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  }, [data?.items, searchQuery]);

  const handleDelete = useCallback((projectId: string, title: string) => {
    Alert.alert(
      'Delete Idea?',
      `"${title}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ id: projectId }),
        },
      ],
    );
  }, [deleteMutation]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const meta = getCardMeta(item);
    const IconComponent = meta.icon;
    const hasResult = !!item.cardResult;
    const cardResult = item.cardResult as any;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 80).springify()}
      >
        <TouchableOpacity
          style={[
            styles.card,
            hasResult && meta.accentColor && { borderLeftWidth: 3, borderLeftColor: meta.accentColor },
          ]}
          onPress={() => router.push(`/(tabs)/vault/${item.id}` as any)}
          onLongPress={() => {
            triggerHaptic('light');
            handleDelete(item.id, item.title);
          }}
          activeOpacity={0.7}
          delayLongPress={400}
        >
          {/* Top section: icon + text */}
          <View style={styles.cardTop}>
            <View style={[styles.cardIcon, { backgroundColor: meta.iconBg }]}>
              <IconComponent size={20} color={meta.iconColor} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.description ? (
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Validation status prompt */}
          {!hasResult ? (
            <View style={styles.validatePrompt}>
              <Zap size={14} color={colors.brand} />
              <Text style={styles.validatePromptText}>Tap to validate this idea</Text>
            </View>
          ) : (
            <View style={styles.validatePrompt}>
              <CheckCircle size={14} color={colors.success} />
              <Text style={[styles.validatePromptText, { color: colors.success }]}>Validated</Text>
            </View>
          )}

          {/* Stats pills for validated cards — Grok-style enclosed grid */}
          {hasResult && cardResult && (
            <View style={styles.statsGrid}>
              <View style={[styles.statPill, { borderColor: meta.accentColor ?? colors.border }]}>
                <Text style={styles.statPillLabel}>Verdict</Text>
                <Text style={[styles.statPillValue, { color: meta.badgeColor }]}>
                  {meta.badgeLabel}
                </Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillLabel}>Problem</Text>
                <Text style={styles.statPillValue}>
                  {cardResult.problemSeverity ? `${Math.round(cardResult.problemSeverity)}/5` : '-'}
                </Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillLabel}>Market</Text>
                <Text style={[styles.statPillValue, { color: getMarketSignalLabel(cardResult.marketSignal).color }]}>
                  {getMarketSignalLabel(cardResult.marketSignal).label}
                </Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillLabel}>TAM</Text>
                <Text style={styles.statPillValue}>
                  {cardResult.tamEstimate?.low ?? '-'}
                </Text>
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.cardTime}>
              {formatRelativeTime(new Date(item.updatedAt))}
            </Text>
            <View style={[styles.badge, { backgroundColor: meta.badgeBg }]}>
              <Text style={[styles.badgeText, { color: meta.badgeColor }]}>
                {meta.badgeLabel}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [router, handleDelete]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyState}>
          <Search size={48} color={colors.mutedDim} />
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptyDescription}>
            Try a different search term
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Archive size={48} color={colors.mutedDim} />
        <Text style={styles.emptyTitle}>No ideas yet</Text>
        <Text style={styles.emptyDescription}>
          Tap Capture to save your first idea
        </Text>
      </View>
    );
  }, [isLoading, searchQuery]);

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vault</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.mutedDim} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search ideas..."
          placeholderTextColor={colors.mutedDim}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* List */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    ...fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.foreground,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
    gap: 14,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
    lineHeight: 18,
  },
  validatePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  validatePromptText: {
    fontSize: 12,
    ...fonts.geist.medium,
    color: colors.brand,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  statPill: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 3,
  },
  statPillLabel: {
    fontSize: 10,
    ...fonts.outfit.medium,
    color: colors.mutedDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statPillValue: {
    fontSize: 15,
    ...fonts.mono.medium,
    color: colors.foreground,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cardTime: {
    fontSize: 12,
    ...fonts.geist.regular,
    color: colors.mutedDim,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    ...fonts.outfit.semiBold,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
});

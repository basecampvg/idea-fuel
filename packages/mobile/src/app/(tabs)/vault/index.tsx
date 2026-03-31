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
  SlidersHorizontal,
  Trash2,
  Zap,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { triggerHaptic } from '../../../components/ui/Button';
import { BottomSheet } from '../../../components/ui/BottomSheet';
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
      iconBg: 'rgba(3, 147, 248, 0.15)',
      badgeLabel: 'Proceed',
      badgeColor: colors.success,
      badgeBg: 'rgba(3, 147, 248, 0.15)',
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
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'validated' | 'draft'>('all');
  const [filterVerdict, setFilterVerdict] = useState<'all' | 'proceed' | 'watchlist' | 'drop'>('all');

  const hasActiveFilters = filterStatus !== 'all' || filterVerdict !== 'all';

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
    let projects = data?.items ?? [];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      projects = projects.filter((p) =>
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus === 'validated') {
      projects = projects.filter((p) => !!(p as any).cardResult);
    } else if (filterStatus === 'draft') {
      projects = projects.filter((p) => !(p as any).cardResult);
    }

    // Verdict filter
    if (filterVerdict !== 'all') {
      projects = projects.filter((p) => (p as any).cardResult?.verdict === filterVerdict);
    }

    return projects;
  }, [data?.items, searchQuery, filterStatus, filterVerdict]);

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
        <LinearGradient
          colors={[colors.glassBorderStart, colors.glassBorderEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(
              hasResult
                ? `/(tabs)/vault/${item.id}/card` as any
                : `/(tabs)/vault/${item.id}` as any
            )}
            onLongPress={() => {
              triggerHaptic('light');
              handleDelete(item.id, item.title);
            }}
            activeOpacity={0.7}
            delayLongPress={400}
          >
          {/* Stroke gradient at top — matches card accent color */}
          {hasResult && meta.accentColor && (
            <LinearGradient
              colors={['transparent', meta.accentColor, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.cardTopGlow}
            />
          )}

          {/* Subtle glow from top based on verdict */}
          {hasResult && meta.accentColor && (
            <LinearGradient
              colors={[`${meta.accentColor}18`, `${meta.accentColor}08`, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.7 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Top section: icon + text + delete */}
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
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.title)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.deleteButton}
            >
              <Trash2 size={16} color={colors.mutedDim} />
            </TouchableOpacity>
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
              <View style={styles.statPill}>
                <Text style={styles.statPillLabel}>Verdict</Text>
                <Text style={styles.statPillValue}>
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
                <Text style={styles.statPillValue}>
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
            <View style={styles.footerLeft}>
              <Text style={styles.cardTime}>
                {formatRelativeTime(new Date(item.updatedAt))}
              </Text>
              <View style={[styles.badge, { backgroundColor: meta.badgeBg }]}>
                <Text style={[styles.badgeText, { color: meta.badgeColor }]}>
                  {meta.badgeLabel}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, hasResult ? styles.actionButtonMuted : styles.actionButtonBrand]}
              onPress={() => router.push(
                hasResult
                  ? `/(tabs)/vault/${item.id}/card` as any
                  : `/(tabs)/vault/${item.id}/validate` as any
              )}
            >
              <Text style={[styles.actionButtonText, hasResult ? styles.actionButtonTextMuted : styles.actionButtonTextBrand]}>
                {hasResult ? 'View Report' : 'Validate Idea'}
              </Text>
              <ChevronRight size={12} color={hasResult ? colors.muted : colors.brand} />
            </TouchableOpacity>
          </View>
          </TouchableOpacity>
        </LinearGradient>
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

      {/* Search + Filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <LinearGradient
            colors={['transparent', colors.brand, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.searchTopGlow}
          />
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
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <SlidersHorizontal size={18} color={hasActiveFilters ? colors.brand : colors.mutedDim} />
        </TouchableOpacity>
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

      {/* Filter Overlay */}
      <BottomSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter"
      >
        {/* Status Section */}
        <Text style={styles.filterSectionLabel}>Status</Text>
        <View style={styles.filterChipRow}>
          {(['all', 'validated', 'draft'] as const).map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.filterChip, filterStatus === val && styles.filterChipActive]}
              onPress={() => { triggerHaptic('light'); setFilterStatus(val); }}
            >
              <Text style={[styles.filterChipText, filterStatus === val && styles.filterChipTextActive]}>
                {val === 'all' ? 'All' : val === 'validated' ? 'Validated' : 'Draft'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Verdict Section */}
        <Text style={styles.filterSectionLabel}>Verdict</Text>
        <View style={styles.filterChipRow}>
          {(['all', 'proceed', 'watchlist', 'drop'] as const).map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.filterChip, filterVerdict === val && styles.filterChipActive]}
              onPress={() => { triggerHaptic('light'); setFilterVerdict(val); }}
            >
              <Text style={[styles.filterChipText, filterVerdict === val && styles.filterChipTextActive]}>
                {val === 'all' ? 'All' : val.charAt(0).toUpperCase() + val.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.filterResetButton}
            onPress={() => { setFilterStatus('all'); setFilterVerdict('all'); }}
          >
            <Text style={styles.filterResetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterApplyButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.filterApplyText}>View</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    overflow: 'hidden',
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandMuted,
  },
  searchTopGlow: {
    position: 'absolute',
    top: -1,
    left: 24,
    right: 24,
    height: 2,
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
  gradientBorder: {
    borderRadius: 24,
    padding: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 23,
    overflow: 'hidden',
  },
  cardTopGlow: {
    position: 'absolute',
    top: -1,
    left: 24,
    right: 24,
    height: 2,
    zIndex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
    gap: 14,
  },
  deleteButton: {
    padding: 4,
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
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  actionButtonBrand: {
    backgroundColor: colors.brandMuted,
  },
  actionButtonMuted: {
    backgroundColor: colors.surface,
  },
  actionButtonText: {
    fontSize: 11,
    ...fonts.outfit.semiBold,
  },
  actionButtonTextBrand: {
    color: colors.brand,
  },
  actionButtonTextMuted: {
    color: colors.muted,
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
  // ── Filter content ──
  filterSectionLabel: {
    fontSize: 14,
    ...fonts.outfit.medium,
    color: colors.muted,
    marginBottom: 12,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  filterChipText: {
    fontSize: 14,
    ...fonts.geist.medium,
    color: colors.muted,
  },
  filterChipTextActive: {
    color: colors.background,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  filterResetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 99,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  filterResetText: {
    fontSize: 16,
    ...fonts.geist.medium,
    color: colors.muted,
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 99,
    backgroundColor: colors.foreground,
    alignItems: 'center',
  },
  filterApplyText: {
    fontSize: 16,
    ...fonts.geist.medium,
    color: colors.background,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../../lib/trpc';
import { IDEA_STATUS_LABELS, IdeaStatus } from '@forge/shared';

// Forge Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  cardHover: '#242220',
  border: '#1F1E1C',
  borderSubtle: '#2A2826',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  // Status colors
  statusDraft: '#A1A1AA',
  statusInterview: '#FBBF24',
  statusResearch: '#60A5FA',
  statusComplete: '#34D399',
};

const STATUS_COLORS: Record<string, string> = {
  CAPTURED: colors.statusDraft,
  INTERVIEWING: colors.statusInterview,
  RESEARCHING: colors.statusResearch,
  COMPLETE: colors.statusComplete,
};

const filters: Array<{ label: string; value: IdeaStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Captured', value: 'CAPTURED' },
  { label: 'Interviewing', value: 'INTERVIEWING' },
  { label: 'Researching', value: 'RESEARCHING' },
  { label: 'Complete', value: 'COMPLETE' },
];

function StatusDot({ status }: { status: string }) {
  return (
    <View
      style={[
        styles.statusDot,
        { backgroundColor: STATUS_COLORS[status] || colors.muted },
      ]}
    />
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingSpinner}>
        <Ionicons name="flame" size={32} color={colors.primary} />
      </View>
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  description,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name={icon} size={40} color={colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {onAction && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.emptyButtonText}>Create Idea</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function IdeasScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<IdeaStatus | 'ALL'>('ALL');

  const { data, isLoading, refetch, isRefetching } = trpc.idea.list.useQuery({});

  const allIdeas = data?.items ?? [];
  const ideas = filter === 'ALL' ? allIdeas : allIdeas.filter((idea) => idea.status === filter);

  if (isLoading && !isRefetching) {
    return <LoadingScreen message="Loading your vault..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vault</Text>
        <Text style={styles.headerSubtitle}>
          {allIdeas.length} {allIdeas.length === 1 ? 'idea' : 'ideas'}
        </Text>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((f) => {
          const isActive = filter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {ideas.length === 0 ? (
          <EmptyState
            icon="archive-outline"
            title={filter === 'ALL' ? 'Your vault is empty' : `No ${filter.toLowerCase()} ideas`}
            description={
              filter === 'ALL'
                ? 'Start forging your first business idea'
                : 'Try a different filter or create a new idea'
            }
            onAction={() => router.push('/(tabs)/dashboard')}
          />
        ) : (
          <View style={styles.ideaList}>
            {ideas.map((idea, index) => (
              <TouchableOpacity
                key={idea.id}
                onPress={() => router.push(`/(tabs)/ideas/${idea.id}`)}
                activeOpacity={0.7}
                style={[
                  styles.ideaCard,
                  index === ideas.length - 1 && { marginBottom: 0 },
                ]}
              >
                {/* Status indicator bar */}
                <View
                  style={[
                    styles.statusBar,
                    { backgroundColor: STATUS_COLORS[idea.status] || colors.muted },
                  ]}
                />

                <View style={styles.ideaContent}>
                  {/* Header row */}
                  <View style={styles.ideaHeader}>
                    <View style={styles.ideaTitleRow}>
                      <StatusDot status={idea.status} />
                      <Text style={styles.ideaTitle} numberOfLines={1}>
                        {idea.title}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>
                        {IDEA_STATUS_LABELS[idea.status]}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={styles.ideaDescription} numberOfLines={2}>
                    {idea.description}
                  </Text>

                  {/* Footer */}
                  <View style={styles.ideaFooter}>
                    <Text style={styles.ideaDate}>
                      {new Date(idea.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.muted}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pagination Info */}
        {data && data.pagination.total > 0 && (
          <Text style={styles.paginationText}>
            Showing {ideas.length} of {data.pagination.total} ideas
          </Text>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/dashboard')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  filterContainer: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.mutedBg,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  ideaList: {
    gap: 12,
  },
  ideaCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  statusBar: {
    height: 3,
    width: '100%',
  },
  ideaContent: {
    padding: 16,
  },
  ideaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ideaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  ideaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.mutedBg,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ideaDescription: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 12,
  },
  ideaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ideaDate: {
    fontSize: 12,
    color: colors.muted,
    opacity: 0.7,
  },
  paginationText: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.muted,
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.mutedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

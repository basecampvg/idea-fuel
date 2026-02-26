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
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, ChevronRight, Search, Archive } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '../../../components/ui/Button';
import { trpc } from '../../../lib/trpc';
import { colors } from '../../../lib/theme';

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

export default function VaultScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch, isRefetching } = trpc.project.list.useQuery({});
  const utils = trpc.useUtils();
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

  const renderItem = useCallback(({ item }: { item: any }) => {
    const hasResearch = item.research?.status === 'COMPLETE';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(tabs)/vault/${item.id}` as any)}
        onLongPress={() => {
          triggerHaptic('light');
          handleDelete(item.id, item.title);
        }}
        activeOpacity={0.7}
        delayLongPress={400}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {hasResearch && (
            <View style={styles.researchBadge}>
              <CheckCircle size={14} color={colors.success} />
            </View>
          )}
        </View>
        {item.description ? (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardTime}>
            Edited {formatRelativeTime(new Date(item.updatedAt))}
          </Text>
          <ChevronRight size={16} color={colors.mutedDim} />
        </View>
      </TouchableOpacity>
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </SafeAreaView>
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
    fontWeight: '700',
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
    borderRadius: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
    marginRight: 8,
  },
  researchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDescription: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTime: {
    fontSize: 13,
    color: colors.mutedDim,
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

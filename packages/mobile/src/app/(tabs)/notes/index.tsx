import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { NotebookPen, CheckCircle, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
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

function deriveTitle(note: any): string {
  if (note.refinedTitle) return note.refinedTitle;
  if (note.content && note.content.length > 0) {
    return note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '');
  }
  return 'Untitled Note';
}

function getNoteMeta(note: any) {
  if (note.promotedProjectId) {
    return {
      icon: CheckCircle,
      iconColor: colors.success,
      iconBg: 'rgba(34, 197, 94, 0.15)',
      badgeVariant: 'success' as const,
      badgeLabel: 'Promoted',
    };
  }
  if (note.refinedTitle) {
    return {
      icon: NotebookPen,
      iconColor: colors.brand,
      iconBg: colors.brandMuted,
      badgeVariant: 'primary' as const,
      badgeLabel: 'Refined',
    };
  }
  return {
    icon: NotebookPen,
    iconColor: colors.mutedDim,
    iconBg: '#262422',
    badgeVariant: null,
    badgeLabel: null,
  };
}

export default function NotesListScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: notes, isLoading, refetch, isRefetching } = trpc.note.list.useQuery();

  const createMutation = trpc.note.create.useMutation({
    onSuccess: (newNote) => {
      triggerHaptic('success');
      utils.note.list.invalidate();
      router.push(`/(tabs)/notes/${newNote.id}` as any);
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to create note. Please try again.');
    },
  });

  const deleteMutation = trpc.note.delete.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.note.list.invalidate();
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to delete note. Please try again.');
    },
  });

  const handleNewNote = useCallback(() => {
    createMutation.mutate({});
  }, [createMutation]);

  const handleDelete = useCallback((noteId: string, title: string) => {
    Alert.alert(
      'Delete this note?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ id: noteId }),
        },
      ],
    );
  }, [deleteMutation]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const meta = getNoteMeta(item);
    const IconComponent = meta.icon;
    const title = deriveTitle(item);

    return (
      <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/(tabs)/notes/${item.id}` as any)}
          onLongPress={() => {
            triggerHaptic('light');
            handleDelete(item.id, title);
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
                {title}
              </Text>
              {item.content ? (
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {item.content}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.cardTime}>
              {formatRelativeTime(new Date(item.updatedAt))}
            </Text>
            {meta.badgeVariant && meta.badgeLabel && (
              <Badge variant={meta.badgeVariant}>{meta.badgeLabel}</Badge>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [router, handleDelete]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <NotebookPen size={36} color={colors.muted} />
        </View>
        <Text style={styles.emptyTitle}>No notes yet</Text>
        <Text style={styles.emptyDescription}>
          Capture a raw thought and let AI refine it into a business idea.
        </Text>
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={handleNewNote}
          activeOpacity={0.7}
        >
          <Plus size={18} color={colors.white} />
          <Text style={styles.emptyCtaText}>New Note</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, handleNewNote]);

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
      </View>

      {/* List */}
      <FlatList
        data={notes ?? []}
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

      {/* FAB - only show when notes exist */}
      {(notes ?? []).length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleNewNote}
          activeOpacity={0.8}
          disabled={createMutation.isPending}
        >
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
      )}
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
    fontFamily: fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
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
    fontFamily: fonts.outfit.semiBold,
    color: colors.foreground,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: fonts.geist.regular,
    color: colors.muted,
    lineHeight: 18,
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
    fontFamily: fonts.mono.regular,
    color: colors.mutedDim,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#262422',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.outfit.semiBold,
    color: colors.foreground,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: fonts.outfit.regular,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  emptyCtaText: {
    fontSize: 16,
    fontFamily: fonts.outfit.semiBold,
    color: colors.white,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

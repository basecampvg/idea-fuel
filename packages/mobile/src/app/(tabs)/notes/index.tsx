import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { NotebookPen, CheckCircle, Plus, Trash2, ChevronRight, Sparkles, HelpCircle } from 'lucide-react-native';
import { useRouter, useNavigation } from 'expo-router';
import { triggerHaptic } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
// NoteTypePopover removed — this tab is hidden, thoughts tab replaces it
import { trpc } from '../../../lib/trpc';
import { colors, fonts } from '../../../lib/theme';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { useShowHelpIcons } from '../../../hooks/useShowHelpIcons';

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
      iconBg: 'rgba(3, 147, 248, 0.15)',
      badgeVariant: 'success' as const,
      badgeLabel: 'Promoted',
    };
  }
  if (note.type === 'QUICK') {
    return {
      icon: NotebookPen,
      iconColor: colors.accent,
      iconBg: 'rgba(20, 184, 166, 0.15)',
      badgeVariant: 'accent' as const,
      badgeLabel: 'Quick',
    };
  }
  if (note.refinedTitle) {
    return {
      icon: Sparkles,
      iconColor: colors.brand,
      iconBg: colors.brandMuted,
      badgeVariant: 'primary' as const,
      badgeLabel: 'Refined',
    };
  }
  return {
    icon: Sparkles,
    iconColor: colors.mutedDim,
    iconBg: '#262422',
    badgeVariant: null,
    badgeLabel: null,
  };
}

const SWIPE_THRESHOLD = 80;

function SwipeableNoteCard({
  note,
  onPress,
  onDelete,
}: {
  note: any;
  onPress: () => void;
  onDelete: () => void;
}) {
  const translateX = useSharedValue(0);
  const meta = getNoteMeta(note);
  const IconComponent = meta.icon;
  const title = deriveTitle(note);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onUpdate((event) => {
      // Clamp: allow left swipe up to -120, right swipe up to 120
      translateX.value = Math.max(-120, Math.min(120, event.translationX));
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        // Swiped left — snap to show delete
        translateX.value = withTiming(-100, { duration: 200, easing: Easing.out(Easing.cubic) });
        runOnJS(triggerHaptic)('light');
      } else if (event.translationX > SWIPE_THRESHOLD) {
        // Swiped right — navigate to card
        translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
        runOnJS(triggerHaptic)('light');
        runOnJS(onPress)();
      } else {
        // Snap back
        translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (translateX.value < -50) {
      // If delete action is showing, snap back
      translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
    } else {
      runOnJS(onPress)();
    }
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  const openActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? 1 : 0,
  }));

  return (
    <View style={styles.swipeContainer}>
      {/* Delete action (revealed on left swipe) */}
      <Animated.View style={[styles.swipeActionDelete, deleteActionStyle]}>
        <TouchableOpacity
          style={styles.swipeActionTouchable}
          onPress={() => {
            translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
            onDelete();
          }}
          activeOpacity={0.7}
        >
          <Trash2 size={22} color={colors.white} />
          <Text style={styles.swipeActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Open action (revealed on right swipe) */}
      <Animated.View style={[styles.swipeActionOpen, openActionStyle]}>
        <View style={styles.swipeActionTouchable}>
          <ChevronRight size={22} color={colors.white} />
          <Text style={styles.swipeActionText}>Open</Text>
        </View>
      </Animated.View>

      {/* Card content */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={cardStyle}>
          <LinearGradient
            colors={[colors.glassBorderStart, colors.glassBorderEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: meta.iconBg }]}>
                  <IconComponent size={20} color={meta.iconColor} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  {note.content ? (
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {note.content}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.cardFooter}>
                <Text style={styles.cardTime}>
                  {formatRelativeTime(new Date(note.updatedAt))}
                </Text>
                <View style={styles.badgeRow}>
                  {meta.badgeVariant && meta.badgeLabel && (
                    <Badge variant={meta.badgeVariant}>{meta.badgeLabel}</Badge>
                  )}
                  {note.sandboxId && (
                    <Badge variant="accent">Pinned</Badge>
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

type NoteFilter = 'all' | 'unpinned' | 'pinned';

export default function NotesListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const utils = trpc.useUtils();
  const { data: notes, isLoading, refetch } = trpc.note.list.useQuery();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [showHelpIcons] = useShowHelpIcons();
  const [guideVisible, setGuideVisible] = useState(false);

  const filteredNotes = React.useMemo(() => {
    if (!notes) return [];
    switch (filter) {
      case 'pinned': return notes.filter((n: any) => n.sandboxId);
      case 'unpinned': return notes.filter((n: any) => !n.sandboxId);
      default: return notes;
    }
  }, [notes, filter]);

  // Refetch notes when screen gains focus (e.g. navigating back from detail)
  // Use invalidate() so it refetches in the background without triggering RefreshControl
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      utils.note.list.invalidate();
    });
    return unsubscribe;
  }, [navigation, utils]);

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refetch]);

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
    return (
      <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
        <SwipeableNoteCard
          note={item}
          onPress={() => router.push(`/(tabs)/notes/${item.id}` as any)}
          onDelete={() => handleDelete(item.id, deriveTitle(item))}
        />
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
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Notes</Text>
          {showHelpIcons && (
            <TouchableOpacity
              onPress={() => { triggerHaptic('light'); setGuideVisible(true); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <HelpCircle size={18} color={colors.mutedDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segmented filter */}
      <View style={styles.segmentedControl}>
        {(['all', 'unpinned', 'pinned'] as NoteFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.segment, filter === f && styles.segmentActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]}>
              {f === 'all' ? 'All' : f === 'unpinned' ? 'Unpinned' : 'Pinned'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredNotes}
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

      <BottomSheet
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title="About Notes"
      >
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 15, color: colors.foreground, ...fonts.outfit.semiBold }}>
            Your idea scratchpad. Capture raw thoughts, observations, and hunches before they disappear.
          </Text>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, color: colors.muted, ...fonts.outfit.semiBold }}>Two types of notes</Text>
            <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
              {'\u2022'} Quick Note — a plain brain dump. Just get the idea out of your head, no AI involved.
            </Text>
            <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
              {'\u2022'} AI Note — writes itself up as you go. The AI auto-refines your raw thought into a structured idea.
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, color: colors.muted, ...fonts.outfit.semiBold }}>Best practices</Text>
            <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
              {'\u2022'} Jot notes as they come — don't overthink it{'\n'}
              {'\u2022'} Pin the ones that keep nagging you{'\n'}
              {'\u2022'} Revisit regularly to spot patterns
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, color: colors.muted, ...fonts.outfit.semiBold }}>How it connects</Text>
            <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
              {'\u2022'} When an idea feels worth exploring, move it to Sandbox for validation{'\n'}
              {'\u2022'} Validated winners end up in your Vault
            </Text>
          </View>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    ...fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 14,
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
  cardDivider: {
    height: 1,
    backgroundColor: colors.glassBorderStart,
    marginHorizontal: 16,
    opacity: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  cardTime: {
    fontSize: 12,
    ...fonts.geist.regular,
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
    ...fonts.outfit.semiBold,
    color: colors.foreground,
  },
  emptyDescription: {
    fontSize: 14,
    ...fonts.outfit.regular,
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
    ...fonts.outfit.semiBold,
    color: colors.white,
  },
  swipeContainer: {
    position: 'relative',
  },
  swipeActionDelete: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    width: 92,
    backgroundColor: colors.destructive,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionOpen: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: colors.brand,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  swipeActionText: {
    color: colors.white,
    fontSize: 12,
    ...fonts.outfit.semiBold,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: colors.card,
  },
  segmentText: {
    fontSize: 13,
    ...fonts.outfit.semiBold,
    color: colors.mutedDim,
  },
  segmentTextActive: {
    color: colors.foreground,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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

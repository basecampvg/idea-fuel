import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
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
import {
  NotebookPen,
  Plus,
  Trash2,
  ChevronRight,
  HelpCircle,
  FlaskConical,
} from 'lucide-react-native';
import { useRouter, useNavigation } from 'expo-router';
import { triggerHaptic } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { useShowHelpIcons } from '../../../hooks/useShowHelpIcons';
import { trpc } from '../../../lib/trpc';
import { colors, fonts } from '../../../lib/theme';

// ────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────────

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

const THOUGHT_TYPE_COLORS: Record<string, string> = {
  problem: '#EF4444',
  solution: '#10B981',
  what_if: '#8B5CF6',
  observation: '#3B82F6',
  question: '#F59E0B',
};

function getThoughtMeta(thought: any) {
  if (thought.promotedProjectId) {
    return {
      dotColor: colors.success,
      badgeVariant: 'success' as const,
      badgeLabel: 'Promoted',
    };
  }
  return {
    dotColor: THOUGHT_TYPE_COLORS[thought.thoughtType] ?? colors.mutedDim,
    badgeVariant: null,
    badgeLabel: null,
  };
}

const SWIPE_THRESHOLD = 80;

const CLUSTER_COLORS = [
  '#6C5CE7',
  '#00B894',
  '#FDCB6E',
  '#E17055',
  '#0984E3',
  '#D63031',
  '#A29BFE',
  '#55EFC4',
];

// ────────────────────────────────────────────────────────────────────────────
// View toggle type
// ────────────────────────────────────────────────────────────────────────────

type ThoughtsView = 'stream' | 'clusters';

// ────────────────────────────────────────────────────────────────────────────
// SwipeableNoteCard (Stream view)
// ────────────────────────────────────────────────────────────────────────────

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
  const meta = getThoughtMeta(note);
  const title = deriveTitle(note);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onUpdate((event) => {
      translateX.value = Math.max(-120, Math.min(120, event.translationX));
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-100, { duration: 200, easing: Easing.out(Easing.cubic) });
        runOnJS(triggerHaptic)('light');
      } else if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
        runOnJS(triggerHaptic)('light');
        runOnJS(onPress)();
      } else {
        translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (translateX.value < -50) {
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
            <View style={styles.noteCard}>
              <View style={styles.noteCardTop}>
                <View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: meta.dotColor, marginTop: 4 }]} />
                <View style={styles.cardText}>
                  <Text style={styles.noteCardTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  {note.content ? (
                    <Text style={styles.noteCardDescription} numberOfLines={2}>
                      {note.content}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.noteCardFooter}>
                <Text style={styles.cardTime}>
                  {formatRelativeTime(new Date(note.updatedAt))}
                </Text>
                <View style={styles.badgeRow}>
                  {meta.badgeVariant && meta.badgeLabel && (
                    <Badge variant={meta.badgeVariant}>{meta.badgeLabel}</Badge>
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

// ────────────────────────────────────────────────────────────────────────────
// SwipeableClusterCard (Clusters view)
// ────────────────────────────────────────────────────────────────────────────

function SwipeableClusterCard({
  cluster,
  onPress,
  onDelete,
}: {
  cluster: any;
  onPress: () => void;
  onDelete: () => void;
}) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onUpdate((event) => {
      translateX.value = Math.max(-120, Math.min(120, event.translationX));
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-100, { duration: 200, easing: Easing.out(Easing.cubic) });
        runOnJS(triggerHaptic)('light');
      } else if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
        runOnJS(triggerHaptic)('light');
        runOnJS(onPress)();
      } else {
        translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (translateX.value < -50) {
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

  const dotColor = cluster.color ?? CLUSTER_COLORS[0];

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
            <View style={styles.clusterCard}>
              <View style={styles.clusterCardTop}>
                <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
                <View style={styles.cardText}>
                  <Text style={styles.clusterCardTitle} numberOfLines={1}>
                    {cluster.name}
                  </Text>
                  <Text style={styles.clusterCardMeta}>
                    {cluster.noteCount === 1 ? '1 note' : `${cluster.noteCount} notes`}
                  </Text>
                </View>
                <Text style={styles.cardTime}>
                  {formatRelativeTime(new Date(cluster.updatedAt))}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CreateClusterModal
// ────────────────────────────────────────────────────────────────────────────

function CreateClusterModal({
  visible,
  onClose,
  onCreate,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CLUSTER_COLORS[0]);

  const handleCreate = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, selectedColor);
  }, [name, selectedColor, onCreate]);

  const handleClose = useCallback(() => {
    setName('');
    setSelectedColor(CLUSTER_COLORS[0]);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={() => {}}
        >
          <Text style={styles.modalTitle}>New Cluster</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="Cluster name"
            placeholderTextColor={colors.mutedDim}
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          <Text style={styles.colorLabel}>Color</Text>
          <View style={styles.colorPicker}>
            {CLUSTER_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorSwatchSelected,
                ]}
                onPress={() => setSelectedColor(c)}
                activeOpacity={0.8}
              />
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalCreateBtn,
                (!name.trim() || isLoading) && styles.modalCreateBtnDisabled,
              ]}
              onPress={handleCreate}
              activeOpacity={0.8}
              disabled={!name.trim() || isLoading}
            >
              <Text style={styles.modalCreateText}>
                {isLoading ? 'Creating\u2026' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ThoughtsScreen (main export)
// ────────────────────────────────────────────────────────────────────────────

export default function ThoughtsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const utils = trpc.useUtils();

  // ── View toggle ──
  const [activeView, setActiveView] = useState<ThoughtsView>('stream');

  // ── Stream (Notes) state ──
  const { data: notes, isLoading: notesLoading, refetch: refetchNotes } = trpc.thought.list.useQuery();
  const [isNotesRefreshing, setIsNotesRefreshing] = useState(false);

  // ── Clusters (Sandboxes) state ──
  const { data: clusters, isLoading: clustersLoading, refetch: refetchClusters } = trpc.cluster.list.useQuery();
  const [isClustersRefreshing, setIsClustersRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ── Help ──
  const [showHelpIcons] = useShowHelpIcons();
  const [guideVisible, setGuideVisible] = useState(false);

  // Refetch on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      utils.thought.list.invalidate();
      utils.cluster.list.invalidate();
    });
    return unsubscribe;
  }, [navigation, utils]);

  // ── Refresh handlers ──
  const handleNotesRefresh = useCallback(async () => {
    setIsNotesRefreshing(true);
    try {
      await refetchNotes();
    } finally {
      setIsNotesRefreshing(false);
    }
  }, [refetchNotes]);

  const handleClustersRefresh = useCallback(async () => {
    setIsClustersRefreshing(true);
    try {
      await refetchClusters();
    } finally {
      setIsClustersRefreshing(false);
    }
  }, [refetchClusters]);

  // ── Note mutations ──
  const thoughtCreateMutation = trpc.thought.create.useMutation({
    onSuccess: (newNote) => {
      triggerHaptic('success');
      utils.thought.list.invalidate();
      router.push(`/(tabs)/thoughts/${newNote.id}` as any);
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to create note. Please try again.');
    },
  });

  const thoughtDeleteMutation = trpc.thought.delete.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.thought.list.invalidate();
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to delete note. Please try again.');
    },
  });

  // ── Cluster mutations ──
  const clusterCreateMutation = trpc.cluster.create.useMutation({
    onSuccess: (newCluster) => {
      triggerHaptic('success');
      utils.cluster.list.invalidate();
      setShowCreateModal(false);
      router.push(`/(tabs)/thoughts/cluster/${newCluster.id}` as any);
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to create cluster. Please try again.');
    },
  });

  const clusterDeleteMutation = trpc.cluster.delete.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.cluster.list.invalidate();
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to delete cluster. Please try again.');
    },
  });

  // ── Thought action handlers ──
  const handleNewThought = useCallback(() => {
    thoughtCreateMutation.mutate({});
  }, [thoughtCreateMutation]);

  const handleDeleteNote = useCallback((noteId: string, title: string) => {
    Alert.alert(
      'Delete this note?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => thoughtDeleteMutation.mutate({ id: noteId }),
        },
      ],
    );
  }, [thoughtDeleteMutation]);

  // ── Cluster action handlers ──
  const handleCreateCluster = useCallback((name: string, color: string) => {
    clusterCreateMutation.mutate({ name, color });
  }, [clusterCreateMutation]);

  const handleDeleteCluster = useCallback((clusterId: string, clusterName: string) => {
    Alert.alert(
      'Delete cluster?',
      `"${clusterName}" and all its pinned notes will be removed. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => clusterDeleteMutation.mutate({ id: clusterId }),
        },
      ],
    );
  }, [clusterDeleteMutation]);

  // ── Stream renderItem ──
  const renderNoteItem = useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
        <SwipeableNoteCard
          note={item}
          onPress={() => router.push(`/(tabs)/thoughts/${item.id}` as any)}
          onDelete={() => handleDeleteNote(item.id, deriveTitle(item))}
        />
      </Animated.View>
    );
  }, [router, handleDeleteNote]);

  // ── Clusters renderItem ──
  const renderClusterItem = useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
        <SwipeableClusterCard
          cluster={item}
          onPress={() => router.push(`/(tabs)/thoughts/cluster/${item.id}` as any)}
          onDelete={() => handleDeleteCluster(item.id, item.name)}
        />
      </Animated.View>
    );
  }, [router, handleDeleteCluster]);

  // ── Stream empty state ──
  const renderStreamEmpty = useCallback(() => {
    if (notesLoading) return null;
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
          onPress={handleNewThought}
          activeOpacity={0.7}
        >
          <Plus size={18} color={colors.white} />
          <Text style={styles.emptyCtaText}>New Note</Text>
        </TouchableOpacity>
      </View>
    );
  }, [notesLoading, handleNewThought]);

  // ── Clusters empty state ──
  const renderClustersEmpty = useCallback(() => {
    if (clustersLoading) return null;
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <FlaskConical size={36} color={colors.muted} />
        </View>
        <Text style={styles.emptyTitle}>No clusters yet</Text>
        <Text style={styles.emptyDescription}>
          Group your notes into clusters to unlock AI-powered insights and idea synthesis.
        </Text>
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color={colors.white} />
          <Text style={styles.emptyCtaText}>New Cluster</Text>
        </TouchableOpacity>
      </View>
    );
  }, [clustersLoading]);

  // ── Guide content per view ──
  const guideContent = activeView === 'stream' ? (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 15, color: colors.foreground, ...fonts.display.semiBold }}>
        Your idea scratchpad. Capture raw thoughts, observations, and hunches before they disappear.
      </Text>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, color: colors.muted, ...fonts.display.semiBold }}>Two types of notes</Text>
        <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
          {'\u2022'} Quick Note — a plain brain dump. Just get the idea out of your head, no AI involved.
        </Text>
        <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
          {'\u2022'} AI Note — writes itself up as you go. The AI auto-refines your raw thought into a structured idea.
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, color: colors.muted, ...fonts.display.semiBold }}>Best practices</Text>
        <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
          {'\u2022'} Jot notes as they come — don't overthink it{'\n'}
          {'\u2022'} Pin the ones that keep nagging you{'\n'}
          {'\u2022'} Revisit regularly to spot patterns
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, color: colors.muted, ...fonts.display.semiBold }}>How it connects</Text>
        <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
          {'\u2022'} When an idea feels worth exploring, move it to a Cluster for validation{'\n'}
          {'\u2022'} Validated winners end up in your Vault
        </Text>
      </View>
    </View>
  ) : (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 15, color: colors.foreground, ...fonts.display.semiBold }}>
        Your testing ground. Take promising ideas and stress-test them with AI-powered validation.
      </Text>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, color: colors.muted, ...fonts.display.semiBold }}>Best practices</Text>
        <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
          {'\u2022'} Bring ideas from the Stream that feel worth pursuing{'\n'}
          {'\u2022'} Run validation analyses to pressure-test assumptions{'\n'}
          {'\u2022'} Compare results across ideas to find the strongest ones
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, color: colors.muted, ...fonts.display.semiBold }}>How it connects</Text>
        <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
          {'\u2022'} Pull raw ideas from the Stream to explore further{'\n'}
          {'\u2022'} Move winners to Vault for long-term tracking
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Thoughts</Text>
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

      {/* Stream / Clusters segmented control */}
      <View style={styles.segmentedControl}>
        {(['stream', 'clusters'] as ThoughtsView[]).map((view) => (
          <TouchableOpacity
            key={view}
            style={[styles.segment, activeView === view && styles.segmentActive]}
            onPress={() => setActiveView(view)}
          >
            <Text style={[styles.segmentText, activeView === view && styles.segmentTextActive]}>
              {view === 'stream' ? 'Stream' : 'Clusters'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stream view */}
      {activeView === 'stream' && (
        <FlatList
          data={notes ?? []}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderStreamEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isNotesRefreshing}
              onRefresh={handleNotesRefresh}
              tintColor={colors.brand}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* Clusters view */}
      {activeView === 'clusters' && (
        <FlatList
          data={clusters ?? []}
          renderItem={renderClusterItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderClustersEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isClustersRefreshing}
              onRefresh={handleClustersRefresh}
              tintColor={colors.brand}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* FAB — Stream: new note, Clusters: new cluster */}
      {activeView === 'stream' && (notes ?? []).length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleNewThought}
          activeOpacity={0.8}
          disabled={thoughtCreateMutation.isPending}
        >
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
      )}
      {activeView === 'clusters' && (clusters ?? []).length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
          disabled={clusterCreateMutation.isPending}
        >
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Guide bottom sheet */}
      <BottomSheet
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        title={activeView === 'stream' ? 'About Stream' : 'About Clusters'}
      >
        {guideContent}
      </BottomSheet>

      {/* Create cluster modal (Clusters view) */}
      <CreateClusterModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateCluster}
        isLoading={clusterCreateMutation.isPending}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
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
    ...fonts.display.bold,
    color: colors.foreground,
    letterSpacing: -0.5,
  },

  // ── Segmented control ──
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
    ...fonts.display.semiBold,
    color: colors.mutedDim,
  },
  segmentTextActive: {
    color: colors.foreground,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },

  // ── Shared card styles ──
  gradientBorder: {
    borderRadius: 24,
    padding: 1,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.glassBorderStart,
    marginHorizontal: 16,
    opacity: 0.5,
  },
  cardTime: {
    fontSize: 12,
    ...fonts.text.regular,
    color: colors.mutedDim,
  },

  // ── Note card (Stream) ──
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: 23,
    overflow: 'hidden',
  },
  noteCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 14,
    gap: 14,
  },
  noteCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noteCardTitle: {
    fontSize: 16,
    ...fonts.display.semiBold,
    color: colors.foreground,
    marginBottom: 4,
  },
  noteCardDescription: {
    fontSize: 13,
    ...fonts.text.regular,
    color: colors.muted,
    lineHeight: 18,
  },
  noteCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // ── Cluster card ──
  clusterCard: {
    backgroundColor: colors.card,
    borderRadius: 23,
    overflow: 'hidden',
  },
  clusterCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    flexShrink: 0,
  },
  clusterCardTitle: {
    fontSize: 16,
    ...fonts.display.semiBold,
    color: colors.foreground,
    marginBottom: 2,
  },
  clusterCardMeta: {
    fontSize: 12,
    ...fonts.text.regular,
    color: colors.mutedDim,
  },

  // ── Empty state ──
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
    ...fonts.display.semiBold,
    color: colors.foreground,
  },
  emptyDescription: {
    fontSize: 14,
    ...fonts.display.regular,
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
    ...fonts.display.semiBold,
    color: colors.white,
  },

  // ── Swipe actions ──
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
    ...fonts.display.semiBold,
  },

  // ── FAB ──
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

  // ── Modal (CreateClusterModal) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    ...fonts.display.bold,
    color: colors.foreground,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    ...fonts.display.regular,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorLabel: {
    fontSize: 13,
    ...fonts.display.semiBold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: colors.foreground,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 15,
    ...fonts.display.semiBold,
    color: colors.muted,
  },
  modalCreateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
  },
  modalCreateBtnDisabled: {
    opacity: 0.4,
  },
  modalCreateText: {
    fontSize: 15,
    ...fonts.display.semiBold,
    color: colors.white,
  },
});

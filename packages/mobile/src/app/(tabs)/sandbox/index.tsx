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
import { FlaskConical, Plus, Trash2, ChevronRight } from 'lucide-react-native';
import { useRouter, useNavigation } from 'expo-router';
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

const SWIPE_THRESHOLD = 80;

const SANDBOX_COLORS = [
  '#6C5CE7',
  '#00B894',
  '#FDCB6E',
  '#E17055',
  '#0984E3',
  '#D63031',
  '#A29BFE',
  '#55EFC4',
];

function SwipeableSandboxCard({
  sandbox,
  onPress,
  onDelete,
}: {
  sandbox: any;
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

  const dotColor = sandbox.color ?? SANDBOX_COLORS[0];

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
                <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {sandbox.name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {sandbox.noteCount === 1 ? '1 note' : `${sandbox.noteCount} notes`}
                  </Text>
                </View>
                <Text style={styles.cardTime}>
                  {formatRelativeTime(new Date(sandbox.updatedAt))}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function CreateSandboxModal({
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
  const [selectedColor, setSelectedColor] = useState(SANDBOX_COLORS[0]);

  const handleCreate = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, selectedColor);
  }, [name, selectedColor, onCreate]);

  const handleClose = useCallback(() => {
    setName('');
    setSelectedColor(SANDBOX_COLORS[0]);
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
          <Text style={styles.modalTitle}>New Sandbox</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="Sandbox name"
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
            {SANDBOX_COLORS.map((c) => (
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
                {isLoading ? 'Creating…' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function SandboxListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const utils = trpc.useUtils();
  const { data: sandboxes, isLoading, refetch } = trpc.sandbox.list.useQuery();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      utils.sandbox.list.invalidate();
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

  const createMutation = trpc.sandbox.create.useMutation({
    onSuccess: (newSandbox) => {
      triggerHaptic('success');
      utils.sandbox.list.invalidate();
      setShowCreateModal(false);
      router.push(`/(tabs)/sandbox/${newSandbox.id}` as any);
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to create sandbox. Please try again.');
    },
  });

  const deleteMutation = trpc.sandbox.delete.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.sandbox.list.invalidate();
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to delete sandbox. Please try again.');
    },
  });

  const handleCreate = useCallback((name: string, color: string) => {
    createMutation.mutate({ name, color });
  }, [createMutation]);

  const handleDelete = useCallback((sandboxId: string, sandboxName: string) => {
    Alert.alert(
      'Delete sandbox?',
      `"${sandboxName}" and all its pinned notes will be removed. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ id: sandboxId }),
        },
      ],
    );
  }, [deleteMutation]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
        <SwipeableSandboxCard
          sandbox={item}
          onPress={() => router.push(`/(tabs)/sandbox/${item.id}` as any)}
          onDelete={() => handleDelete(item.id, item.name)}
        />
      </Animated.View>
    );
  }, [router, handleDelete]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <FlaskConical size={36} color={colors.muted} />
        </View>
        <Text style={styles.emptyTitle}>No sandboxes yet</Text>
        <Text style={styles.emptyDescription}>
          Group your notes into sandboxes to unlock AI-powered insights and idea synthesis.
        </Text>
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color={colors.white} />
          <Text style={styles.emptyCtaText}>New Sandbox</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading]);

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sandbox</Text>
      </View>

      {/* List */}
      <FlatList
        data={sandboxes ?? []}
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

      {/* FAB - only show when sandboxes exist */}
      {(sandboxes ?? []).length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
          disabled={createMutation.isPending}
        >
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
      )}

      <CreateSandboxModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        isLoading={createMutation.isPending}
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
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 12,
    ...fonts.geist.regular,
    color: colors.mutedDim,
  },
  cardTime: {
    fontSize: 12,
    ...fonts.geist.regular,
    color: colors.mutedDim,
    flexShrink: 0,
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
  // Modal styles
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
    ...fonts.outfit.bold,
    color: colors.foreground,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    ...fonts.outfit.regular,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorLabel: {
    fontSize: 13,
    ...fonts.outfit.semiBold,
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
    ...fonts.outfit.semiBold,
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
    ...fonts.outfit.semiBold,
    color: colors.white,
  },
});

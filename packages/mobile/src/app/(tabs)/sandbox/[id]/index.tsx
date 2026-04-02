import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Plus,
  Sparkles,
  ListTodo,
  Rocket,
  Search,
  FileText,
  AlertTriangle,
  NotebookPen,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { triggerHaptic } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { AiActionSheet } from '../../../../components/AiActionSheet';
import { trpc } from '../../../../lib/trpc';
import { colors, fonts } from '../../../../lib/theme';

const AI_ACTIONS = [
  { key: 'summarize', label: 'Summarize', icon: FileText, color: '#6C5CE7' },
  { key: 'extractTodos', label: 'Extract Todos', icon: ListTodo, color: '#00B894' },
  { key: 'promoteToIdea', label: 'Promote to Idea', icon: Rocket, color: '#E32B1A' },
  { key: 'identifyGaps', label: 'Find Gaps', icon: Search, color: '#0984E3' },
  { key: 'generateBrief', label: 'Generate Brief', icon: FileText, color: '#FDCB6E' },
  { key: 'findContradictions', label: 'Contradictions', icon: AlertTriangle, color: '#E17055' },
] as const;

type AiActionKey = typeof AI_ACTIONS[number]['key'];

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

type AiActionResult =
  | { type: 'summary'; data: { summary: string } }
  | { type: 'todos'; data: { todos: string[] } }
  | { type: 'gaps'; data: { gaps: string[] } }
  | { type: 'brief'; data: { brief: string } }
  | { type: 'contradictions'; data: { contradictions: string[] } }
  | { type: 'promoted'; data: { projectId: string } };

export default function SandboxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const utils = trpc.useUtils();

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiActionResult | null>(null);
  const [showResultSheet, setShowResultSheet] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.sandbox.get.useQuery({ id });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      utils.sandbox.get.invalidate({ id });
    });
    return unsubscribe;
  }, [navigation, utils, id]);

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refetch]);

  // AI mutations
  const summarizeMutation = trpc.sandbox.summarize.useMutation();
  const extractTodosMutation = trpc.sandbox.extractTodos.useMutation();
  const promoteToIdeaMutation = trpc.sandbox.promoteToIdea.useMutation();
  const identifyGapsMutation = trpc.sandbox.identifyGaps.useMutation();
  const generateBriefMutation = trpc.sandbox.generateBrief.useMutation();
  const findContradictionsMutation = trpc.sandbox.findContradictions.useMutation();

  // Create note mutation
  const createNoteMutation = trpc.note.create.useMutation({
    onSuccess: (newNote) => {
      triggerHaptic('success');
      utils.sandbox.get.invalidate({ id });
      utils.note.list.invalidate();
      router.push(`/(tabs)/notes/${newNote.id}` as any);
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to create note. Please try again.');
    },
  });

  const handleAiAction = useCallback(async (actionKey: AiActionKey) => {
    setShowAiMenu(false);
    setAiLoading(true);
    triggerHaptic('medium');

    try {
      switch (actionKey) {
        case 'summarize': {
          const result = await summarizeMutation.mutateAsync({ id });
          setAiResult({ type: 'summary', data: result });
          break;
        }
        case 'extractTodos': {
          const result = await extractTodosMutation.mutateAsync({ id });
          setAiResult({ type: 'todos', data: result });
          break;
        }
        case 'promoteToIdea': {
          const result = await promoteToIdeaMutation.mutateAsync({ id });
          setAiResult({ type: 'promoted', data: result });
          break;
        }
        case 'identifyGaps': {
          const result = await identifyGapsMutation.mutateAsync({ id });
          setAiResult({ type: 'gaps', data: result });
          break;
        }
        case 'generateBrief': {
          const result = await generateBriefMutation.mutateAsync({ id });
          setAiResult({ type: 'brief', data: result });
          break;
        }
        case 'findContradictions': {
          const result = await findContradictionsMutation.mutateAsync({ id });
          setAiResult({ type: 'contradictions', data: result });
          break;
        }
      }
      triggerHaptic('success');
      setShowResultSheet(true);
    } catch (err: any) {
      triggerHaptic('error');
      const msg = err?.message ?? 'AI action failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setAiLoading(false);
    }
  }, [id, summarizeMutation, extractTodosMutation, promoteToIdeaMutation, identifyGapsMutation, generateBriefMutation, findContradictionsMutation]);

  const handleAddNote = useCallback(() => {
    createNoteMutation.mutate({ type: 'QUICK', sandboxId: id });
  }, [createNoteMutation, id]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const title = deriveTitle(item);
    const hasRefined = !!item.refinedTitle;

    return (
      <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.push(`/(tabs)/notes/${item.id}` as any)}
        >
          <LinearGradient
            colors={[colors.glassBorderStart, colors.glassBorderEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: hasRefined ? colors.brandMuted : '#262422' }]}>
                  <NotebookPen size={20} color={hasRefined ? colors.brand : colors.mutedDim} />
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
              <View style={styles.cardFooter}>
                <Text style={styles.cardTime}>
                  {formatRelativeTime(new Date(item.updatedAt))}
                </Text>
                {hasRefined && (
                  <Badge variant="primary">Refined</Badge>
                )}
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [router]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <NotebookPen size={36} color={colors.muted} />
        </View>
        <Text style={styles.emptyTitle}>No notes pinned</Text>
        <Text style={styles.emptyDescription}>
          Tap + to add a new note directly to this sandbox.
        </Text>
      </View>
    );
  }, [isLoading]);

  const sandbox = data;
  const sandboxNotes = data?.notes ?? [];
  const dotColor = sandbox?.color ?? '#6C5CE7';

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {sandbox ? (
            <>
              <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {sandbox.name}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.headerRight}>
          {sandbox ? (
            <Text style={styles.noteCount}>
              {sandboxNotes.length === 1 ? '1 note' : `${sandboxNotes.length} notes`}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Notes list */}
      <FlatList
        data={sandboxNotes}
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

      {/* AI loading overlay */}
      {aiLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Running AI action…</Text>
        </View>
      )}

      {/* AI menu overlay (dismiss backdrop) */}
      {showAiMenu && (
        <TouchableOpacity
          style={styles.menuDismiss}
          activeOpacity={1}
          onPress={() => setShowAiMenu(false)}
        />
      )}

      {/* AI action menu */}
      {showAiMenu && (
        <View style={styles.aiMenu}>
          {AI_ACTIONS.map((action) => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity
                key={action.key}
                style={styles.aiMenuItem}
                onPress={() => handleAiAction(action.key)}
                activeOpacity={0.75}
              >
                <View style={[styles.aiMenuIcon, { backgroundColor: `${action.color}22` }]}>
                  <IconComponent size={18} color={action.color} />
                </View>
                <Text style={styles.aiMenuLabel}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* FABs */}
      <View style={styles.fabContainer}>
        {/* Small + FAB */}
        <TouchableOpacity
          style={styles.fabSmall}
          onPress={handleAddNote}
          activeOpacity={0.8}
          disabled={createNoteMutation.isPending}
        >
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>

        {/* Sparkles FAB */}
        <TouchableOpacity
          style={styles.fabLarge}
          onPress={() => {
            triggerHaptic('light');
            setShowAiMenu((v) => !v);
          }}
          activeOpacity={0.8}
          disabled={aiLoading}
        >
          <Sparkles size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* AI result bottom sheet */}
      <AiActionSheet
        visible={showResultSheet}
        onClose={() => {
          setShowResultSheet(false);
          setAiResult(null);
        }}
        result={aiResult}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 20,
    ...fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
    flex: 1,
  },
  headerRight: {
    flexShrink: 0,
  },
  noteCount: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 10,
  },
  loadingText: {
    fontSize: 15,
    ...fonts.geist.regular,
    color: colors.muted,
  },
  menuDismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  aiMenu: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 30,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMenuLabel: {
    fontSize: 15,
    ...fonts.outfit.medium,
    color: colors.foreground,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 40,
  },
  fabSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabLarge: {
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

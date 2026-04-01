import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import {
  CloudUpload,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Trash2,
  Rocket,
  Sparkles,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Button, triggerHaptic } from '../../../../components/ui/Button';
import { IdeaCard } from '../../../../components/ui/IdeaCard';
import { BottomSheet } from '../../../../components/ui/BottomSheet';
import { MarkdownEditor, type MarkdownEditorRef } from '../../../../components/editor/MarkdownEditor';
import { useNoteAutoSave, type SaveStatus } from '../../../../hooks/useNoteAutoSave';
import { trpc } from '../../../../lib/trpc';
import { colors, fonts } from '../../../../lib/theme';

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;

  const config = {
    saving: { Icon: CloudUpload, text: 'Saving...', color: colors.muted },
    saved: { Icon: CheckCircle, text: 'Saved', color: colors.success },
    error: { Icon: AlertCircle, text: 'Failed', color: colors.destructive },
  };

  const { Icon, text, color } = config[status];

  return (
    <View style={styles.saveIndicator}>
      <Icon size={14} color={color} />
      <Text style={[styles.saveText, { color }]}>{text}</Text>
    </View>
  );
}

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const editorRef = useRef<MarkdownEditorRef>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [cardCollapsed, setCardCollapsed] = useState(false);
  const [showPromotedSheet, setShowPromotedSheet] = useState(false);
  const [showExtractedSheet, setShowExtractedSheet] = useState(false);
  const [extractedCount, setExtractedCount] = useState(0);
  const [canExtract, setCanExtract] = useState(false);
  const autoRefineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentLengthRef = useRef(0);
  const noteTypeRef = useRef<string | undefined>(undefined);

  // Auto-collapse IdeaCard when keyboard appears so editor has room
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setCardCollapsed(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setCardCollapsed(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const { data: note, isLoading, error } = trpc.note.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  const utils = trpc.useUtils();

  const deleteMutation = trpc.note.delete.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.note.list.invalidate();
      router.back();
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to delete note.');
    },
  });

  const refineMutation = trpc.note.refine.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.note.get.invalidate({ id: id! });
      utils.note.list.invalidate();
    },
    onError: () => {
      // Silent fail — auto-refine will retry on next typing pause
    },
  });

  const promotedRef = useRef(false);

  const promoteMutation = trpc.note.promote.useMutation({
    onSuccess: () => {
      promotedRef.current = true;
      triggerHaptic('success');
      // Kill pending auto-refine so it doesn't fire on a deleted note
      if (autoRefineTimer.current) {
        clearTimeout(autoRefineTimer.current);
        autoRefineTimer.current = null;
      }
      // Nuke note caches — reset forces a fresh fetch next time
      utils.note.list.reset();
      utils.note.get.invalidate({ id: id! });
      utils.project.list.invalidate();
      setShowPromotedSheet(true);
    },
    onError: (err) => {
      triggerHaptic('error');
      if (err.message === 'NO_REFINEMENT') {
        Alert.alert('Error', 'Refine this note first before promoting.');
      } else {
        Alert.alert('Error', "Couldn't create idea — try again.");
      }
    },
  });

  const extractMutation = trpc.note.extractIdeas.useMutation({
    onSuccess: (result) => {
      triggerHaptic('success');
      utils.note.list.invalidate();
      setExtractedCount(result.extractedCount);
      setShowExtractedSheet(true);
    },
    onError: (err) => {
      triggerHaptic('error');
      if (err.message.includes('at least')) {
        Alert.alert('Too Short', 'Write a bit more before extracting ideas.');
      } else {
        Alert.alert('Error', 'Failed to extract ideas. Please try again.');
      }
    },
  });

  // Auto-save hook
  const {
    saveStatus,
    markDirty,
    flush,
    setInitialContent,
  } = useNoteAutoSave({
    noteId: id!,
    getContent: async () => {
      if (!editorRef.current) return '';
      return await editorRef.current.getMarkdown();
    },
    debounceMs: 1500,
    maxIntervalMs: 30000,
  });

  // Set initial data when note loads
  useEffect(() => {
    if (note && !initialLoaded) {
      setInitialContent(note.content ?? '');
      contentLengthRef.current = (note.content ?? '').length;
      noteTypeRef.current = note.type;
      setCanExtract(contentLengthRef.current >= 50);
      setInitialLoaded(true);
    }
  }, [note, initialLoaded, setInitialContent]);

  // Flush pending saves on navigate away (skip if note was promoted/deleted)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (!promotedRef.current) flush();
    });
    return unsubscribe;
  }, [navigation, flush]);

  // Auto-refine after 3s of no typing, if content is long enough
  const scheduleAutoRefine = useCallback(() => {
    if (autoRefineTimer.current) clearTimeout(autoRefineTimer.current);
    autoRefineTimer.current = setTimeout(async () => {
      if (!editorRef.current || refineMutation.isPending || promotedRef.current) return;
      const md = await editorRef.current.getMarkdown();
      contentLengthRef.current = md.length;
      if (md.length < 50) return;
      // Flush save first, then refine once save settles
      flush();
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (saveStatus !== 'saving' || attempts >= 15) {
          clearInterval(interval);
          refineMutation.mutate({ id: id! });
        }
      }, 200);
    }, 3000);
  }, [refineMutation, flush, saveStatus, id]);

  // Clean up auto-refine timer
  useEffect(() => {
    return () => {
      if (autoRefineTimer.current) clearTimeout(autoRefineTimer.current);
    };
  }, []);

  const handleEditorChange = useCallback(async () => {
    markDirty();
    if (noteTypeRef.current === 'QUICK') {
      // Track content length for Extract Ideas button enable/disable
      if (editorRef.current) {
        const md = await editorRef.current.getMarkdown();
        contentLengthRef.current = md.length;
        setCanExtract(md.length >= 50);
      }
    } else {
      scheduleAutoRefine();
    }
  }, [markDirty, scheduleAutoRefine]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete this note?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ id: id! }),
        },
      ],
    );
  }, [id, deleteMutation]);

  const handlePromote = useCallback(() => {
    promoteMutation.mutate({ id: id! });
  }, [id, promoteMutation]);

  const handleExtractIdeas = useCallback(async () => {
    await flush();
    extractMutation.mutate({ id: id! });
  }, [id, extractMutation, flush]);

  // Determine if refinement is stale
  const isStale = !!(
    note?.lastRefinedAt &&
    note?.updatedAt &&
    new Date(note.lastRefinedAt).getTime() < new Date(note.updatedAt).getTime()
  );

  const isPromoted = !!note?.promotedProjectId;

  if (isLoading) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </View>
    );
  }

  if (error || !note) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.destructive} />
          <Text style={styles.errorText}>Failed to load note</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              flush();
              router.back();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <SaveIndicator status={saveStatus} />
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={20} color={colors.mutedDim} />
          </TouchableOpacity>
        </View>

        {/* IdeaCard at top when refinement exists — only for AI notes */}
        {note.type !== 'QUICK' && note.refinedTitle && (
          <View style={styles.ideaCardContainer}>
            {cardCollapsed ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCardCollapsed(false)}
              >
                <View style={styles.collapsedCard}>
                  <Text style={styles.collapsedTitle} numberOfLines={1}>
                    {note.refinedTitle}
                  </Text>
                  <Text style={styles.collapsedHint}>Tap to expand</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <IdeaCard
                refinedTitle={note.refinedTitle}
                refinedDescription={note.refinedDescription ?? ''}
                refinedTags={note.refinedTags ?? []}

                isPromoted={isPromoted}
                isRefining={refineMutation.isPending}
                isPromoting={promoteMutation.isPending}
                onPromote={handlePromote}
                onCollapse={() => setCardCollapsed(true)}
              />
            )}
          </View>
        )}

        {/* Refining indicator (first time, no card yet) — only for AI notes */}
        {note.type !== 'QUICK' && refineMutation.isPending && !note.refinedTitle && (
          <View style={styles.refiningIndicator}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={styles.refiningText}>AI is refining your idea...</Text>
          </View>
        )}

        {/* Rich text editor */}
        {initialLoaded && (
          <MarkdownEditor
            ref={editorRef}
            initialContent={note.content ?? ''}
            placeholder={note.type === 'QUICK'
              ? "Dump your thoughts here. When you're ready, tap Extract Ideas to pull out the good stuff..."
              : "Brain dump your idea here. Once you pause typing, AI will refine it into something sharp..."
            }
            onChange={handleEditorChange}
          />
        )}
      </KeyboardAvoidingView>

      {/* Extract Ideas bar for Quick Notes */}
      {note.type === 'QUICK' && (
        <View style={styles.extractBar}>
          <Button
            variant="primary"
            size="lg"
            onPress={handleExtractIdeas}
            isLoading={extractMutation.isPending}
            disabled={extractMutation.isPending || !canExtract}
            leftIcon={<Sparkles size={18} color={colors.white} />}
            style={styles.extractButton}
          >
            Extract Ideas
          </Button>
        </View>
      )}

      {/* Extraction success sheet */}
      <BottomSheet
        visible={showExtractedSheet}
        onClose={() => {
          setShowExtractedSheet(false);
          router.back();
        }}
        showCloseButton={false}
      >
        <View style={styles.promotedSheet}>
          <View style={[styles.promotedIconCircle, { backgroundColor: 'rgba(20, 184, 166, 0.15)' }]}>
            <Sparkles size={28} color={colors.accent} />
          </View>
          <Text style={styles.promotedTitle}>
            {extractedCount} {extractedCount === 1 ? 'Idea' : 'Ideas'} Extracted
          </Text>
          <Text style={styles.promotedDescription}>
            AI found {extractedCount} business {extractedCount === 1 ? 'idea' : 'ideas'} in your note. Each one is now a separate AI note you can review and promote.
          </Text>
          <Button
            variant="primary"
            size="lg"
            onPress={() => {
              setShowExtractedSheet(false);
              router.back();
            }}
            style={styles.promotedButton}
          >
            View Notes
          </Button>
        </View>
      </BottomSheet>

      {/* Promoted success sheet */}
      <BottomSheet
        visible={showPromotedSheet}
        onClose={() => {
          setShowPromotedSheet(false);
          router.back();
          router.navigate('/(tabs)/vault');
        }}
        showCloseButton={false}
      >
        <View style={styles.promotedSheet}>
          <View style={styles.promotedIconCircle}>
            <Rocket size={28} color={colors.brand} />
          </View>
          <Text style={styles.promotedTitle}>Idea Created</Text>
          <Text style={styles.promotedDescription}>
            Your note has been refined into an idea and promoted to the Vault, where you can validate it and dive deeper.
          </Text>
          <Button
            variant="primary"
            size="lg"
            onPress={() => {
              setShowPromotedSheet(false);
              router.back();
              router.navigate('/(tabs)/vault');
            }}
            style={styles.promotedButton}
          >
            Go to Vault
          </Button>
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    ...fonts.outfit.regular,
    color: colors.muted,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontSize: 15,
    ...fonts.outfit.medium,
    color: colors.foreground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveText: {
    fontSize: 13,
    ...fonts.outfit.medium,
  },
  ideaCardContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  collapsedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  collapsedTitle: {
    flex: 1,
    fontSize: 14,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
    marginRight: 8,
  },
  collapsedHint: {
    fontSize: 12,
    ...fonts.outfit.regular,
    color: colors.mutedDim,
  },
  refiningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.brandMuted,
    borderRadius: 12,
  },
  refiningText: {
    fontSize: 13,
    ...fonts.outfit.medium,
    color: colors.brand,
  },
  promotedSheet: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  promotedIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotedTitle: {
    fontSize: 20,
    ...fonts.outfit.bold,
    color: colors.foreground,
  },
  promotedDescription: {
    fontSize: 15,
    ...fonts.geist.regular,
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  promotedButton: {
    width: '100%',
    marginTop: 8,
  },
  extractBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  extractButton: {
    width: '100%',
  },
});

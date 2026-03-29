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
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { triggerHaptic } from '../../../../components/ui/Button';
import { IdeaCard } from '../../../../components/ui/IdeaCard';
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
  const hasAutoRefined = useRef(false);
  const contentLengthRef = useRef(0);

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
    onError: (err) => {
      triggerHaptic('error');
      if (err.message === 'REFINEMENT_FAILED') {
        Alert.alert('Refinement Failed', "Couldn't refine — tap Refine to retry.");
      }
    },
  });

  const promoteMutation = trpc.note.promote.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.note.get.invalidate({ id: id! });
      utils.note.list.invalidate();
      Alert.alert('Idea Created', 'Find it in your Vault.');
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
      setInitialLoaded(true);
      // If note already has a refinement, mark auto-refine as done
      if (note.refinedTitle) {
        hasAutoRefined.current = true;
      }
    }
  }, [note, initialLoaded, setInitialContent]);

  // Flush pending saves on navigate away
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      flush();
    });
    return unsubscribe;
  }, [navigation, flush]);

  // Auto-trigger refine when editor content reaches 50 chars (first time only)
  const checkAutoRefine = useCallback(async () => {
    if (hasAutoRefined.current || !initialLoaded || refineMutation.isPending) return;
    if (!editorRef.current) return;
    const md = await editorRef.current.getMarkdown();
    contentLengthRef.current = md.length;
    if (md.length >= 50) {
      hasAutoRefined.current = true;
      flush();
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (saveStatus !== 'saving' || attempts >= 15) {
          clearInterval(interval);
          refineMutation.mutate({ id: id! });
        }
      }, 200);
    }
  }, [initialLoaded, refineMutation, flush, saveStatus, id]);

  const handleEditorChange = useCallback(() => {
    markDirty();
    checkAutoRefine();
  }, [markDirty, checkAutoRefine]);

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

  const handleRefine = useCallback(async () => {
    if (!editorRef.current) return;
    const md = await editorRef.current.getMarkdown();
    if (md.length < 50) {
      Alert.alert('Too Short', 'Write at least 50 characters before refining.');
      return;
    }
    flush();
    // Wait for save to settle before refining
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (saveStatus !== 'saving' || attempts >= 15) {
        clearInterval(interval);
        refineMutation.mutate({ id: id! });
      }
    }, 200);
  }, [id, flush, refineMutation, saveStatus]);

  const handlePromote = useCallback(() => {
    promoteMutation.mutate({ id: id! });
  }, [id, promoteMutation]);

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

        {/* IdeaCard at top when refinement exists — capped height so editor always has room */}
        {note.refinedTitle && (
          <TouchableOpacity
            style={styles.ideaCardContainer}
            activeOpacity={0.8}
            onPress={() => setCardCollapsed(!cardCollapsed)}
          >
            {cardCollapsed ? (
              <View style={styles.collapsedCard}>
                <Text style={styles.collapsedTitle} numberOfLines={1}>
                  {note.refinedTitle}
                </Text>
                <Text style={styles.collapsedHint}>Tap to expand</Text>
              </View>
            ) : (
              <IdeaCard
                refinedTitle={note.refinedTitle}
                refinedDescription={note.refinedDescription ?? ''}
                refinedTags={note.refinedTags ?? []}
                isStale={isStale}
                isPromoted={isPromoted}
                isRefining={refineMutation.isPending}
                isPromoting={promoteMutation.isPending}
                onRefine={handleRefine}
                onPromote={handlePromote}
              />
            )}
          </TouchableOpacity>
        )}

        {/* Refinement error state */}
        {refineMutation.isError && !note.refinedTitle && (
          <TouchableOpacity
            style={styles.refineError}
            onPress={handleRefine}
            activeOpacity={0.7}
          >
            <AlertCircle size={16} color={colors.warning} />
            <Text style={styles.refineErrorText}>
              Couldn't refine — tap to retry
            </Text>
          </TouchableOpacity>
        )}

        {/* Refining indicator (first time, no card yet) */}
        {refineMutation.isPending && !note.refinedTitle && (
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
            placeholder="Start writing your idea..."
            onChange={handleEditorChange}
          />
        )}
      </KeyboardAvoidingView>
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
    fontFamily: fonts.outfit.regular,
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
    fontFamily: fonts.outfit.medium,
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
    fontFamily: fonts.outfit.medium,
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
    fontFamily: fonts.outfit.semiBold,
    color: colors.foreground,
    marginRight: 8,
  },
  collapsedHint: {
    fontSize: 12,
    fontFamily: fonts.outfit.regular,
    color: colors.mutedDim,
  },
  refineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  refineErrorText: {
    fontSize: 13,
    fontFamily: fonts.outfit.medium,
    color: colors.warning,
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
    fontFamily: fonts.outfit.medium,
    color: colors.brand,
  },
});

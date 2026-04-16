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
  ScrollView,
  Share,
  TextInput,
  Keyboard,
} from 'react-native';
import {
  CloudUpload,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronDown,
  Rocket,
  MoreHorizontal,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Button, triggerHaptic } from '../../../../components/ui/Button';
import { BottomSheet } from '../../../../components/ui/BottomSheet';
import { MarkdownEditor, EditorToolbar, type MarkdownEditorRef } from '../../../../components/editor/MarkdownEditor';
import { ThumbnailStrip, type LocalAttachment } from '../../../../components/ThumbnailStrip';
import { ClusterPicker } from '../../../../components/ClusterPicker';
import { ThoughtPicker } from '../../../../components/ThoughtPicker';
import {
  PropertyChipBar,
  SourceLabel,
  AIRefinementSection,
  ConnectionsSection,
  ActivityLog,
  CommentThread,
  OverflowMenu,
} from '../../../../components/thought';
import { useNoteAutoSave, type SaveStatus } from '../../../../hooks/useNoteAutoSave';
import { trpc } from '../../../../lib/trpc';
import { useToast } from '../../../../contexts/ToastContext';
import { colors, fonts } from '../../../../lib/theme';

// Lazy-load expo-image-picker — has native code that may not be in every build
let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Native module not available in this build
}

// Lazy-load expo-clipboard — not installed in all builds
let Clipboard: { setStringAsync: (text: string) => Promise<boolean> } | null = null;
try {
  Clipboard = require('expo-clipboard');
} catch {
  // Fallback handled in handleCopyText
}

const MAX_NOTE_ATTACHMENTS = 10;

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
  const { id, fromSandbox, fromCluster } = useLocalSearchParams<{ id: string; fromSandbox?: string; fromCluster?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const editorRef = useRef<MarkdownEditorRef>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [showPromotedSheet, setShowPromotedSheet] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showClusterPicker, setShowClusterPicker] = useState(false);
  const [showThoughtPicker, setShowThoughtPicker] = useState(false);
  const [titleText, setTitleText] = useState('');
  const [editorBridge, setEditorBridge] = useState<any>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const titleDirty = useRef(false);
  const contentLengthRef = useRef(0);

  // Attachment state
  const [localAttachments, setLocalAttachments] = useState<LocalAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ── Queries ──

  const { data: note, isLoading, error } = trpc.thought.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  const { data: events, isLoading: eventsLoading } = trpc.thought.listEvents.useQuery(
    { thoughtId: id! },
    { enabled: !!id },
  );

  const { data: connections, isLoading: connectionsLoading } = trpc.thought.listConnections.useQuery(
    { thoughtId: id! },
    { enabled: !!id },
  );

  const utils = trpc.useUtils();

  // ── Mutations ──

  const deleteMutation = trpc.thought.delete.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.thought.list.invalidate();
      const clusterId = fromCluster || fromSandbox;
      if (clusterId) {
        utils.cluster.get.invalidate({ id: clusterId });
        router.navigate(`/(tabs)/thoughts/cluster/${clusterId}` as any);
      } else {
        router.back();
      }
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to delete note.');
    },
  });

  const refineMutation = trpc.thought.refine.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.thought.get.invalidate({ id: id! });
      utils.thought.list.invalidate();
    },
    onError: () => {
      // Silent fail — auto-refine will retry on next typing pause
    },
  });

  const promotedRef = useRef(false);

  const promoteMutation = trpc.thought.promote.useMutation({
    onSuccess: () => {
      promotedRef.current = true;
      triggerHaptic('success');
      utils.thought.list.reset();
      utils.thought.get.invalidate({ id: id! });
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

  const pinMutation = trpc.thought.addToCluster.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.thought.get.invalidate({ id });
      setShowClusterPicker(false);
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to pin note.');
    },
  });

  const unpinMutation = trpc.thought.removeFromCluster.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.thought.get.invalidate({ id });
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to unpin note.');
    },
  });

  const updatePropertiesMutation = trpc.thought.updateProperties.useMutation({
    onSuccess: () => {
      utils.thought.get.invalidate({ id: id! });
      utils.thought.list.invalidate();
    },
  });

  const updateLabelsMutation = trpc.thought.updateLabels.useMutation({
    onSuccess: () => {
      utils.thought.get.invalidate({ id: id! });
      utils.thought.list.invalidate();
    },
  });

  const addCommentMutation = trpc.thought.addComment.useMutation({
    onSuccess: () => utils.thought.get.invalidate({ id: id! }),
  });

  const deleteCommentMutation = trpc.thought.deleteComment.useMutation({
    onSuccess: () => utils.thought.get.invalidate({ id: id! }),
  });

  const linkThoughtMutation = trpc.thought.linkThought.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      showToast({ message: 'Connection added', type: 'success' });
      utils.thought.listConnections.invalidate({ thoughtId: id! });
    },
    onError: (err) => {
      triggerHaptic('error');
      if (err.message === 'Connection already exists') {
        showToast({ message: 'Already connected', type: 'error' });
      } else {
        Alert.alert('Error', 'Failed to add connection.');
      }
    },
  });

  const removeConnectionMutation = trpc.thought.removeConnection.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.thought.listConnections.invalidate({ thoughtId: id! });
    },
  });

  const duplicateMutation = trpc.thought.duplicate.useMutation({
    onSuccess: (dup) => {
      triggerHaptic('success');
      showToast({ message: `Duplicated as T-${dup.thoughtNumber}`, type: 'success' });
      utils.thought.list.invalidate();
    },
  });

  const getUploadUrl = trpc.attachment.getUploadUrl.useMutation();
  const addAttachments = trpc.thought.addAttachments.useMutation({
    onSuccess: () => {
      setLocalAttachments([]);
      utils.thought.get.invalidate({ id: id! });
    },
    onError: () => {
      triggerHaptic('error');
      showToast({ message: 'Failed to save attachments', type: 'error' });
    },
  });

  const removeAttachment = trpc.thought.removeAttachment.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.thought.get.invalidate({ id: id! });
    },
    onError: () => {
      triggerHaptic('error');
      showToast({ message: 'Failed to remove attachment', type: 'error' });
    },
  });

  // ── Auto-save hook ──

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
      setTitleText(note.title ?? '');
      contentLengthRef.current = (note.content ?? '').length;
      setInitialLoaded(true);
      // Grab editor bridge for external toolbar after a tick
      setTimeout(() => {
        if (editorRef.current) {
          setEditorBridge(editorRef.current.getEditorBridge());
        }
      }, 100);
    }
  }, [note, initialLoaded, setInitialContent]);

  // Flush pending saves on navigate away (skip if note was promoted/deleted)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (!promotedRef.current) flush();
    });
    return unsubscribe;
  }, [navigation, flush]);

  // Track keyboard visibility
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // ── Title auto-save (debounced) ──
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateTitleMutation = trpc.thought.update.useMutation({
    onSuccess: () => utils.thought.get.invalidate({ id: id! }),
  });

  const handleTitleChange = useCallback((text: string) => {
    setTitleText(text);
    titleDirty.current = true;
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      updateTitleMutation.mutate({ id: id!, content: note?.content ?? '', title: text || null });
      titleDirty.current = false;
    }, 1000);
  }, [id, note?.content, updateTitleMutation]);

  // ── Handlers ──

  const handleEditorChange = useCallback(() => {
    markDirty();
  }, [markDirty]);

  const handleBack = useCallback(() => {
    flush();
    if (fromCluster || fromSandbox) {
      router.navigate(`/(tabs)/thoughts/cluster/${fromCluster || fromSandbox}` as any);
    } else {
      router.back();
    }
  }, [flush, fromCluster, fromSandbox, router]);

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

  // PropertyChipBar handlers
  const handleUpdateMaturity = useCallback((level: string) => {
    updatePropertiesMutation.mutate({ id: id!, maturityLevel: level as any });
  }, [id, updatePropertiesMutation]);

  const handleUpdateType = useCallback((type: string) => {
    updatePropertiesMutation.mutate({ id: id!, thoughtType: type as any });
  }, [id, updatePropertiesMutation]);

  const handleUpdateConfidence = useCallback((level: string) => {
    updatePropertiesMutation.mutate({ id: id!, confidenceLevel: level as any });
  }, [id, updatePropertiesMutation]);

  const handleUpdatePurpose = useCallback((purpose: string) => {
    updatePropertiesMutation.mutate({ id: id!, purpose: purpose as any });
  }, [id, updatePropertiesMutation]);

  const handleUpdateLabels = useCallback((labels: string[]) => {
    updateLabelsMutation.mutate({ thoughtId: id!, labels });
  }, [id, updateLabelsMutation]);

  // OverflowMenu handlers
  const handleCopyText = useCallback(() => {
    setShowOverflow(false);
    if (Clipboard) {
      Clipboard.setStringAsync(note?.content ?? '');
    }
    showToast({ message: 'Copied to clipboard', type: 'success' });
  }, [note?.content, showToast]);

  const handleShare = useCallback(() => {
    setShowOverflow(false);
    Share.share({ message: note?.content ?? '' });
  }, [note?.content]);

  const handleArchive = useCallback(() => {
    setShowOverflow(false);
    // For now, just delete (archive not fully implemented on server)
    handleDelete();
  }, [handleDelete]);

  // ── Attachment helpers ──

  const savedAttachments = note?.attachments ?? [];
  const totalAttachments = savedAttachments.length + localAttachments.length;

  // Combined display array for ThumbnailStrip
  const combinedAttachments: LocalAttachment[] = [
    ...savedAttachments.map((a) => ({
      uri: a.publicUrl ?? '',
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    })),
    ...localAttachments,
  ];

  const processPickerResult = useCallback((result: { canceled: boolean; assets?: Array<{ uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number | null }> | null }) => {
    if (result.canceled || !result.assets) return;

    const remaining = MAX_NOTE_ATTACHMENTS - totalAttachments;
    const newImages = result.assets.slice(0, remaining).map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName || `image-${Date.now()}.jpg`,
      mimeType: (asset.mimeType || 'image/jpeg') as string,
      sizeBytes: asset.fileSize || 0,
    }));

    if (newImages.length === 0) return;

    setLocalAttachments((prev) => [...prev, ...newImages]);
    uploadAndPersist(newImages);
  }, [totalAttachments]);

  const uploadAndPersist = useCallback(async (images: LocalAttachment[]) => {
    setIsUploading(true);
    try {
      const attachmentMetadata: Array<{
        storagePath: string;
        fileName: string;
        mimeType: 'image/jpeg' | 'image/png' | 'image/heic';
        sizeBytes: number;
        order: number;
      }> = [];

      const startOrder = savedAttachments.length;

      for (let i = 0; i < images.length; i++) {
        const att = images[i];
        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          fileName: att.fileName,
          mimeType: att.mimeType as 'image/jpeg' | 'image/png' | 'image/heic',
        });

        const response = await fetch(att.uri);
        const blob = await response.blob();

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': att.mimeType },
          body: blob,
        });

        if (!uploadResponse.ok) {
          showToast({ message: `Failed to upload image ${i + 1}`, type: 'error' });
          continue;
        }

        attachmentMetadata.push({
          storagePath,
          fileName: att.fileName,
          mimeType: att.mimeType as 'image/jpeg' | 'image/png' | 'image/heic',
          sizeBytes: att.sizeBytes,
          order: startOrder + i,
        });
      }

      if (attachmentMetadata.length > 0) {
        await addAttachments.mutateAsync({
          noteId: id!,
          attachments: attachmentMetadata,
        });
      } else {
        setLocalAttachments([]);
      }
    } catch (err) {
      triggerHaptic('error');
      console.error('[NoteEditor] Upload failed:', err);
      showToast({ message: 'Failed to upload images', type: 'error' });
      setLocalAttachments([]);
    } finally {
      setIsUploading(false);
    }
  }, [id, savedAttachments.length, getUploadUrl, addAttachments, showToast]);

  const handleRemoveThumbnail = useCallback((index: number) => {
    const savedCount = savedAttachments.length;
    if (index < savedCount) {
      const attachment = savedAttachments[index];
      removeAttachment.mutate({ attachmentId: attachment.id });
    } else {
      const localIndex = index - savedCount;
      setLocalAttachments((prev) => prev.filter((_, i) => i !== localIndex));
    }
  }, [savedAttachments, removeAttachment]);

  // ── Loading / Error states ──

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
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <SaveIndicator status={saveStatus} />
          <TouchableOpacity
            onPress={() => setShowOverflow(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreHorizontal size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Thought ID + timestamp row */}
          <View style={styles.idRow}>
            <Text style={styles.thoughtId}>T-{note.thoughtNumber}</Text>
            <SourceLabel captureMethod={note.captureMethod} createdAt={note.createdAt} />
          </View>

          {/* Property Chip Bar */}
          <View style={styles.chipSection}>
            <PropertyChipBar
              maturityLevel={note.maturityLevel as any}
              thoughtType={note.thoughtType as any}
              confidenceLevel={note.confidenceLevel as any}
              purpose={note.purpose ?? 'idea'}
              labels={note.tags ?? []}
              clusterId={note.clusterId ?? null}
              clusterName={note.cluster?.name ?? null}
              clusterColor={note.cluster?.color ?? null}
              typeSource={note.typeSource}
              onUpdateMaturity={handleUpdateMaturity}
              onUpdateType={handleUpdateType}
              onUpdateConfidence={handleUpdateConfidence}
              onUpdatePurpose={handleUpdatePurpose}
              onUpdateLabels={handleUpdateLabels}
              onAddToCluster={(clusterId) => pinMutation.mutate({ thoughtId: id!, clusterId })}
              onRemoveFromCluster={() => unpinMutation.mutate({ thoughtId: id! })}
            />
          </View>

          {/* Title (optional) */}
          <TextInput
            style={styles.titleInput}
            value={titleText}
            onChangeText={handleTitleChange}
            placeholder="Add title..."
            placeholderTextColor={colors.mutedDim}
            maxLength={200}
          />

          {/* Editor — height scales with content */}
          {initialLoaded && (
            <View style={[styles.editorContainer, { height: Math.max(200, Math.ceil((note.content?.split('\n').length ?? 3) * 24 + 80)) }]}>
              <MarkdownEditor
                ref={editorRef}
                initialContent={note.content ?? ''}
                placeholder="Dump your thoughts here..."
                onChange={handleEditorChange}
              />
            </View>
          )}

          {/* Attachments */}
          {combinedAttachments.length > 0 && (
            <View style={styles.attachmentSection}>
              <ThumbnailStrip
                attachments={combinedAttachments}
                onRemove={handleRemoveThumbnail}
                maxAttachments={MAX_NOTE_ATTACHMENTS}
              />
              {isUploading && (
                <ActivityIndicator size="small" color={colors.brand} style={{ marginLeft: 4 }} />
              )}
            </View>
          )}

          {/* AI Refinement */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <AIRefinementSection
              refinedTitle={note.refinedTitle}
              refinedDescription={note.refinedDescription}
              refinedTags={note.refinedTags}
              lastRefinedAt={note.lastRefinedAt}
              updatedAt={note.updatedAt}
              isRefining={refineMutation.isPending}
              onRefine={() => refineMutation.mutate({ id: id! })}
            />
          </View>

          {/* Connections */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <ConnectionsSection
              connections={(connections ?? []) as any}
              isLoading={connectionsLoading}
              onViewThought={(thoughtId) => router.push(`/(tabs)/notes/${thoughtId}` as any)}
              onAddConnection={() => setShowThoughtPicker(true)}
              onRemoveConnection={(connectionId) => removeConnectionMutation.mutate({ connectionId })}
            />
          </View>

          {/* Activity Log */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <ActivityLog
              events={((events as any)?.events ?? []) as any}
              isLoading={eventsLoading}
              hasMore={!!(events as any)?.nextCursor}
              onLoadMore={() => {}}
            />
          </View>

          {/* Comments */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <CommentThread
              comments={(note.comments ?? []) as any}
              onAddComment={(content) => addCommentMutation.mutate({ thoughtId: id!, content })}
              onDeleteComment={(commentId) => deleteCommentMutation.mutate({ commentId })}
              isSubmitting={addCommentMutation.isPending}
            />
          </View>
        </ScrollView>

        {/* Toolbar — pinned above keyboard, only visible when keyboard is open */}
        {editorBridge && keyboardVisible && (
          <View style={styles.toolbarContainer}>
            <View style={styles.toolbarRow}>
              <View style={{ flex: 1 }}>
                <EditorToolbar editor={editorBridge} />
              </View>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => {
                  editorBridge.blur();
                  Keyboard.dismiss();
                }}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ChevronDown size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Overflow Menu */}
      <OverflowMenu
        visible={showOverflow}
        onClose={() => setShowOverflow(false)}
        onRefine={() => refineMutation.mutate({ id: id! })}
        onAddToCluster={() => setShowClusterPicker(true)}
        onDuplicate={() => duplicateMutation.mutate({ id: id! })}
        onArchive={handleArchive}
        onCopyText={handleCopyText}
        onShare={handleShare}
        onDelete={handleDelete}
        isRefined={!!note.refinedTitle}
        isArchived={note.isArchived}
      />

      {/* Cluster Picker */}
      <ClusterPicker
        visible={showClusterPicker}
        onClose={() => setShowClusterPicker(false)}
        onSelect={(clusterId) => pinMutation.mutate({ thoughtId: id!, clusterId })}
      />

      {/* Thought Picker for connections */}
      <ThoughtPicker
        visible={showThoughtPicker}
        onClose={() => setShowThoughtPicker(false)}
        onSelect={(targetId) => linkThoughtMutation.mutate({ thoughtId: id!, targetThoughtId: targetId })}
        excludeId={id!}
      />

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
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  thoughtId: {
    fontSize: 13,
    color: colors.mutedDim,
    ...fonts.geist.regular,
  },
  chipSection: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  titleInput: {
    fontSize: 20,
    ...fonts.outfit.bold,
    color: colors.foreground,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editorContainer: {
    // Height set dynamically based on content line count
  },
  toolbarContainer: {
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dismissButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2D2B28',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  attachmentSection: {
    paddingHorizontal: 20,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
});

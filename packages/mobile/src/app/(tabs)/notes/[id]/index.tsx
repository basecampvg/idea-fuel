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
  Pin,
  PinOff,
  ImagePlus,
  Camera,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Button, triggerHaptic } from '../../../../components/ui/Button';
import { IdeaCard } from '../../../../components/ui/IdeaCard';
import { BottomSheet } from '../../../../components/ui/BottomSheet';
import { MarkdownEditor, type MarkdownEditorRef } from '../../../../components/editor/MarkdownEditor';
import { ThumbnailStrip, type LocalAttachment } from '../../../../components/ThumbnailStrip';
import { useNoteAutoSave, type SaveStatus } from '../../../../hooks/useNoteAutoSave';
import { trpc } from '../../../../lib/trpc';
import { useToast } from '../../../../contexts/ToastContext';
import { colors, fonts } from '../../../../lib/theme';
import { SandboxPicker } from '../../../../components/SandboxPicker';

// Lazy-load expo-image-picker — has native code that may not be in every build
let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Native module not available in this build
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
  const [cardCollapsed, setCardCollapsed] = useState(false);
  const [showPromotedSheet, setShowPromotedSheet] = useState(false);
  const [showSandboxPicker, setShowSandboxPicker] = useState(false);
  const contentLengthRef = useRef(0);

  // Attachment state
  const [localAttachments, setLocalAttachments] = useState<LocalAttachment[]>([]);
  const [showPopover, setShowPopover] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Auto-collapse IdeaCard when keyboard appears so editor has room
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setCardCollapsed(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setCardCollapsed(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const { data: note, isLoading, error } = trpc.thought.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  const utils = trpc.useUtils();

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
      // Nuke thought caches — reset forces a fresh fetch next time
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
      setShowSandboxPicker(false);
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
    }
  }, [note, initialLoaded, setInitialContent]);

  // Flush pending saves on navigate away (skip if note was promoted/deleted)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (!promotedRef.current) flush();
    });
    return unsubscribe;
  }, [navigation, flush]);

  const handleEditorChange = useCallback(() => {
    markDirty();
  }, [markDirty]);

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

  // ── Attachment helpers ──

  const savedAttachments = note?.attachments ?? [];
  const totalAttachments = savedAttachments.length + localAttachments.length;
  const attachmentsAtMax = totalAttachments >= MAX_NOTE_ATTACHMENTS;

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

  const handleOpenPopover = useCallback(() => {
    if (attachmentsAtMax) return;
    setShowPopover(true);
  }, [attachmentsAtMax]);

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

    // Add to local state immediately for instant thumbnail display
    setLocalAttachments((prev) => [...prev, ...newImages]);

    // Upload and persist
    uploadAndPersist(newImages);
  }, [totalAttachments]);

  const handleCamera = useCallback(async () => {
    setShowPopover(false);
    if (!ImagePicker) {
      showToast({ message: 'Image picker not available — rebuild required', type: 'error' });
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Camera permission required', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    processPickerResult(result);
  }, [showToast, processPickerResult]);

  const handlePhotos = useCallback(async () => {
    setShowPopover(false);
    if (!ImagePicker) {
      showToast({ message: 'Image picker not available — rebuild required', type: 'error' });
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Photo library permission required', type: 'error' });
      return;
    }
    const remaining = MAX_NOTE_ATTACHMENTS - totalAttachments;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    processPickerResult(result);
  }, [showToast, totalAttachments, processPickerResult]);

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

        // Upload directly to Supabase Storage
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
          thoughtId: id!,
          attachments: attachmentMetadata,
        });
      } else {
        // All uploads failed — clear local state
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
      // It's a saved attachment — remove from server
      const attachment = savedAttachments[index];
      removeAttachment.mutate({ attachmentId: attachment.id });
    } else {
      // It's a local (pending) attachment — just remove from state
      const localIndex = index - savedCount;
      setLocalAttachments((prev) => prev.filter((_, i) => i !== localIndex));
    }
  }, [savedAttachments, removeAttachment]);

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
              if (fromCluster || fromSandbox) {
                router.navigate(`/(tabs)/thoughts/cluster/${fromCluster || fromSandbox}` as any);
              } else {
                router.back();
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <SaveIndicator status={saveStatus} />
          <View style={styles.headerPill}>
            {note?.sandboxId ? (
              <TouchableOpacity
                style={styles.pillButton}
                onPress={() => unpinMutation.mutate({ thoughtId: id! })}
              >
                <PinOff size={18} color={colors.muted} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.pillButton}
                onPress={() => setShowSandboxPicker(true)}
              >
                <Pin size={18} color={colors.foreground} />
              </TouchableOpacity>
            )}
            <View style={styles.pillDivider} />
            <TouchableOpacity
              style={[styles.pillButton, attachmentsAtMax && { opacity: 0.4 }]}
              onPress={handleOpenPopover}
              disabled={attachmentsAtMax}
            >
              <ImagePlus size={18} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.pillDivider} />
            <TouchableOpacity
              style={styles.pillButton}
              onPress={handleDelete}
            >
              <Trash2 size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Thumbnail strip (saved + local attachments) */}
        {combinedAttachments.length > 0 && (
          <View style={styles.thumbnailStripContainer}>
            <ThumbnailStrip
              attachments={combinedAttachments}
              onRemove={handleRemoveThumbnail}
              maxAttachments={MAX_NOTE_ATTACHMENTS}
            />
            {isUploading && (
              <ActivityIndicator size="small" color={colors.brand} style={styles.uploadingIndicator} />
            )}
          </View>
        )}

        {/* IdeaCard at top when refinement exists */}
        {note.refinedTitle && (
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
            placeholder="Dump your thoughts here..."
            onChange={handleEditorChange}
          />
        )}
      </KeyboardAvoidingView>

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

      <SandboxPicker
        visible={showSandboxPicker}
        onClose={() => setShowSandboxPicker(false)}
        onSelect={(clusterId) => pinMutation.mutate({ thoughtId: id!, clusterId })}
      />

      {/* Image picker dropdown — anchored top-right below header pill */}
      {showPopover && (
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowPopover(false)}
          />
          <View style={styles.imageDropdown}>
            <TouchableOpacity style={styles.dropdownRow} onPress={handleCamera} activeOpacity={0.7}>
              <View style={styles.dropdownIcon}>
                <Camera size={20} color={colors.foreground} />
              </View>
              <Text style={styles.dropdownLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownRow} onPress={handlePhotos} activeOpacity={0.7}>
              <View style={styles.dropdownIcon}>
                <ImageIcon size={20} color={colors.foreground} />
              </View>
              <Text style={styles.dropdownLabel}>Photos</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  imageDropdown: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    width: 180,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  dropdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownLabel: {
    fontSize: 15,
    color: colors.foreground,
    ...fonts.geist.regular,
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
  thumbnailStripContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadingIndicator: {
    marginLeft: 4,
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
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
});

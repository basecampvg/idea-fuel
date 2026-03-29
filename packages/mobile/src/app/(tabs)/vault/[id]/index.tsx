import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CloudUpload, CheckCircle, AlertCircle, ChevronLeft, Trash2, Zap, CreditCard } from 'lucide-react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Button, triggerHaptic } from '../../../../components/ui/Button';
import { MarkdownEditor, type MarkdownEditorRef } from '../../../../components/editor/MarkdownEditor';
import { useAutoSave, type SaveStatus } from '../../../../hooks/useAutoSave';
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

export default function NotebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const editorRef = useRef<MarkdownEditorRef>(null);
  const [title, setTitle] = useState('');
  const [initialNotesLoaded, setInitialNotesLoaded] = useState(false);
  const titleDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: project, isLoading, error } = trpc.project.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const utils = trpc.useUtils();
  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.project.list.invalidate();
      router.back();
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to delete idea.');
    },
  });

  const titleUpdateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
    },
  });

  // Auto-save hook for notes
  const {
    saveStatus,
    markDirty,
    flush,
    setInitialContent,
  } = useAutoSave({
    projectId: id!,
    getContent: async () => {
      if (!editorRef.current) return '';
      return await editorRef.current.getMarkdown();
    },
    debounceMs: 1500,
    maxIntervalMs: 30000,
    field: 'notes',
  });

  // Set initial data when project loads
  useEffect(() => {
    if (project && !initialNotesLoaded) {
      setTitle(project.title);
      setInitialContent(project.notes ?? '');
      setInitialNotesLoaded(true);
    }
  }, [project, initialNotesLoaded, setInitialContent]);

  // Flush pending saves on navigate away
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      flush();
    });
    return unsubscribe;
  }, [navigation, flush]);

  // Debounced title save
  const handleTitleChange = useCallback((text: string) => {
    setTitle(text);
    if (titleDebounceTimer.current) clearTimeout(titleDebounceTimer.current);
    if (!text.trim()) return; // Don't save empty title

    titleDebounceTimer.current = setTimeout(() => {
      titleUpdateMutation.mutate({
        id: id!,
        data: { title: text.trim() },
      });
    }, 1500);
  }, [id, titleUpdateMutation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Idea?',
      `"${title}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ id: id! }),
        },
      ],
    );
  }, [title, id, deleteMutation]);

  const handleEditorChange = useCallback(() => {
    markDirty();
  }, [markDirty]);

  if (isLoading) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </View>
    );
  }

  if (error || !project) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.destructive} />
          <Text style={styles.errorText}>Failed to load idea</Text>
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

        {/* Title */}
        <View style={styles.titleSection}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Idea title"
            placeholderTextColor={colors.mutedDim}
            multiline
            maxLength={80}
          />
          {project.description && (
            <Text style={styles.description}>
              {project.description}
            </Text>
          )}
        </View>

        {/* Quick Validate / View Card */}
        <View style={styles.validateSection}>
          {project.cardResult ? (
            <Button
              variant="primary"
              size="md"
              onPress={() => router.push(`/(tabs)/vault/${id}/card` as any)}
              leftIcon={<CreditCard size={18} color={colors.white} />}
              style={styles.validateButton}
            >
              View Card
            </Button>
          ) : (
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/vault/${id}/validate` as any)}
              disabled={title.trim().length < 3}
              activeOpacity={0.85}
              style={[
                styles.quickValidateButton,
                title.trim().length < 3 && styles.quickValidateButtonDisabled,
              ]}
            >
              <Zap size={20} color={colors.white} />
              <Text style={styles.quickValidateText}>Quick Validate</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Editor */}
        {initialNotesLoaded && (
          <MarkdownEditor
            ref={editorRef}
            initialContent={project.notes ?? ''}
            placeholder="Start writing..."
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
    color: colors.foreground,
    fontWeight: '500',
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
    fontWeight: '500',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  titleInput: {
    fontSize: 24,
    fontFamily: fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
    padding: 0,
    minHeight: 32,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.geist.regular,
    color: colors.mutedDim,
    lineHeight: 20,
    marginTop: 8,
  },
  validateSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  validateButton: {
    width: '100%',
  },
  quickValidateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E8421A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  quickValidateButtonDisabled: {
    opacity: 0.4,
  },
  quickValidateText: {
    fontSize: 16,
    fontFamily: fonts.outfit.semiBold,
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    marginBottom: 4,
  },
});

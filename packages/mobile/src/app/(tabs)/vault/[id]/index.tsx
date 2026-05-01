import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  ScrollView,
} from 'react-native';
import { CloudUpload, CheckCircle, AlertCircle, ChevronLeft, Trash2, Zap, CreditCard, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Button, triggerHaptic } from '../../../../components/ui/Button';
import { MarkdownEditor, type MarkdownEditorRef } from '../../../../components/editor/MarkdownEditor';
import { useAutoSave, type SaveStatus } from '../../../../hooks/useAutoSave';
import { ValidationStatusBadge, type ValidationStatus } from '../../../../components/idea/ValidationStatusBadge';
import { trpc } from '../../../../lib/trpc';
import { colors, fonts } from '../../../../lib/theme';

type CrystallizedFieldKey =
  | 'problemStatement'
  | 'targetAudience'
  | 'proposedSolution'
  | 'uniqueAngle'
  | 'pricingHypothesis';

const FIELD_META: { key: CrystallizedFieldKey; label: string; placeholder: string }[] = [
  { key: 'problemStatement', label: 'Problem',           placeholder: 'What problem are you solving?' },
  { key: 'targetAudience',   label: 'Audience',          placeholder: 'Who has this problem?' },
  { key: 'proposedSolution', label: 'Solution',          placeholder: 'How do you solve it?' },
  { key: 'uniqueAngle',      label: 'Unique Angle',      placeholder: 'What makes your approach different?' },
  { key: 'pricingHypothesis',label: 'Pricing Hypothesis',placeholder: 'How will users pay?' },
];

const STATUS_FLOW: ValidationStatus[] = ['draft', 'in_validation', 'validated', 'killed'];

function STATUS_LABEL(s: ValidationStatus) {
  switch (s) {
    case 'draft': return 'Draft';
    case 'in_validation': return 'In Validation';
    case 'validated': return 'Validated';
    case 'killed': return 'Killed';
    case 'returned': return 'Returned';
  }
}

function CrystallizedField({
  label,
  placeholder,
  initialValue,
  onSave,
}: {
  label: string;
  placeholder: string;
  initialValue: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const lastSavedRef = useRef(initialValue);

  // Re-sync if upstream data changes (e.g., after invalidation) and the user
  // hasn't started editing this field locally.
  useEffect(() => {
    if (value === lastSavedRef.current) {
      setValue(initialValue);
      lastSavedRef.current = initialValue;
    }
  }, [initialValue, value]);

  const handleBlur = () => {
    const trimmed = value.trim();
    if (trimmed === lastSavedRef.current.trim()) return;
    lastSavedRef.current = value;
    onSave(value);
  };

  return (
    <View style={crystallizedFieldStyles.container}>
      <Text style={crystallizedFieldStyles.label}>{label}</Text>
      <TextInput
        style={crystallizedFieldStyles.input}
        value={value}
        onChangeText={setValue}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedDim}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const crystallizedFieldStyles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 6,
  },
  label: {
    fontSize: 11,
    ...fonts.outfit.semiBold,
    color: colors.mutedDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 15,
    ...fonts.geist.regular,
    color: colors.foreground,
    lineHeight: 22,
    minHeight: 44,
    padding: 0,
  },
});

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

  const { data: project, isLoading, error } = trpc.idea.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const utils = trpc.useUtils();
  const deleteMutation = trpc.idea.delete.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.idea.list.invalidate();
      router.navigate('/(tabs)/vault' as any);
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to delete idea.');
    },
  });

  const titleUpdateMutation = trpc.idea.update.useMutation({
    onSuccess: () => {
      utils.idea.list.invalidate();
    },
  });

  const fieldUpdateMutation = trpc.idea.update.useMutation({
    onSuccess: () => {
      utils.idea.get.invalidate({ id: id! });
      utils.idea.list.invalidate();
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to save changes.');
    },
  });

  const statusUpdateMutation = trpc.idea.update.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.idea.get.invalidate({ id: id! });
      utils.idea.list.invalidate();
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to update status.');
    },
  });

  const returnToClusterMutation = trpc.idea.update.useMutation({
    onSuccess: (_data, variables) => {
      triggerHaptic('success');
      utils.idea.list.invalidate();
      const sourceClusterId = (project as any)?.sourceClusterId;
      if (sourceClusterId) {
        utils.cluster.get.invalidate({ id: sourceClusterId });
        router.replace(`/(tabs)/sandbox/${sourceClusterId}` as any);
      } else {
        router.navigate('/(tabs)/vault' as any);
      }
    },
    onError: () => {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to return idea to cluster.');
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

  // Determine whether this is a "legacy" idea (no crystallized provenance/fields).
  const ideaAny = project as any;
  const isLegacy = useMemo(() => {
    if (!ideaAny) return true;
    if (ideaAny.crystallizedAt) return false;
    return (
      !ideaAny.problemStatement &&
      !ideaAny.targetAudience &&
      !ideaAny.proposedSolution &&
      !ideaAny.uniqueAngle &&
      !ideaAny.pricingHypothesis
    );
  }, [ideaAny]);

  const validationStatus: ValidationStatus = (ideaAny?.validationStatus ?? 'draft') as ValidationStatus;
  const sourceClusterId: string | null = ideaAny?.sourceClusterId ?? null;

  const saveField = useCallback(
    (field: CrystallizedFieldKey, value: string) => {
      if (!id) return;
      const trimmed = value.trim();
      const payload = trimmed.length === 0 ? null : trimmed;
      // Avoid no-op saves
      if ((ideaAny?.[field] ?? null) === payload) return;
      fieldUpdateMutation.mutate({
        id,
        data: { [field]: payload } as any,
      });
    },
    [id, ideaAny, fieldUpdateMutation],
  );

  const handleStatusSelect = useCallback(
    (next: ValidationStatus) => {
      if (!id) return;
      if (next === validationStatus) return;
      statusUpdateMutation.mutate({ id, data: { validationStatus: next } });
    },
    [id, validationStatus, statusUpdateMutation],
  );

  const handleSendBackToCluster = useCallback(() => {
    if (!id || !sourceClusterId) return;
    Alert.alert(
      'Return this idea to its source cluster?',
      'You can re-crystallize it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return',
          style: 'destructive',
          onPress: () => returnToClusterMutation.mutate({ id, data: { validationStatus: 'returned' } }),
        },
      ],
    );
  }, [id, sourceClusterId, returnToClusterMutation]);

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.navigate('/(tabs)/vault' as any)}>
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
              router.navigate('/(tabs)/vault' as any);
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

        {isLegacy ? (
          <>
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

            {/* Validation status picker */}
            <View style={styles.statusSection}>
              <Text style={styles.sectionLabel}>Status</Text>
              <View style={styles.statusChipRow}>
                {STATUS_FLOW.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => { triggerHaptic('light'); handleStatusSelect(s); }}
                    style={[
                      styles.statusChip,
                      validationStatus === s && styles.statusChipActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        validationStatus === s && styles.statusChipTextActive,
                      ]}
                    >
                      {STATUS_LABEL(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
                {validationStatus === 'returned' && (
                  <ValidationStatusBadge status="returned" />
                )}
              </View>
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
                    initialNotesLoaded && title.trim().length < 3 && styles.quickValidateButtonDisabled,
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
          </>
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
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
            </View>

            {/* Validation status picker */}
            <View style={styles.statusSection}>
              <Text style={styles.sectionLabel}>Status</Text>
              <View style={styles.statusChipRow}>
                {STATUS_FLOW.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => { triggerHaptic('light'); handleStatusSelect(s); }}
                    style={[
                      styles.statusChip,
                      validationStatus === s && styles.statusChipActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        validationStatus === s && styles.statusChipTextActive,
                      ]}
                    >
                      {STATUS_LABEL(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
                {validationStatus === 'returned' && (
                  <ValidationStatusBadge status="returned" />
                )}
              </View>
            </View>

            {/* Crystallized fields */}
            <View style={styles.fieldsSection}>
              {FIELD_META.map(({ key, label, placeholder }) => (
                <CrystallizedField
                  key={key}
                  label={label}
                  placeholder={placeholder}
                  initialValue={(ideaAny?.[key] as string | null) ?? ''}
                  onSave={(val) => saveField(key, val)}
                />
              ))}
            </View>

            {/* Source cluster link + back-to-cluster action */}
            {sourceClusterId && (
              <View style={styles.provenanceSection}>
                <TouchableOpacity
                  style={styles.provenanceRow}
                  onPress={() => router.push(`/(tabs)/sandbox/${sourceClusterId}` as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.provenanceLinkText}>View source cluster</Text>
                  <ArrowRight size={14} color={colors.brand} />
                </TouchableOpacity>
                {validationStatus !== 'returned' && (
                  <TouchableOpacity
                    style={styles.returnRow}
                    onPress={handleSendBackToCluster}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={14} color={colors.muted} />
                    <Text style={styles.returnText}>Send back to cluster</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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
                    initialNotesLoaded && title.trim().length < 3 && styles.quickValidateButtonDisabled,
                  ]}
                >
                  <Zap size={20} color={colors.white} />
                  <Text style={styles.quickValidateText}>Quick Validate</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
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
    ...fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
    padding: 0,
    minHeight: 32,
  },
  description: {
    fontSize: 14,
    ...fonts.geist.regular,
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
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  quickValidateButtonDisabled: {
    opacity: 0.4,
  },
  quickValidateText: {
    fontSize: 16,
    ...fonts.outfit.semiBold,
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    ...fonts.outfit.semiBold,
    color: colors.mutedDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statusSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  statusChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  statusChipText: {
    fontSize: 12,
    ...fonts.outfit.semiBold,
    color: colors.muted,
  },
  statusChipTextActive: {
    color: colors.background,
  },
  fieldsSection: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  provenanceSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  provenanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.brandMuted,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  provenanceLinkText: {
    fontSize: 14,
    ...fonts.outfit.semiBold,
    color: colors.brand,
  },
  returnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  returnText: {
    fontSize: 13,
    ...fonts.outfit.medium,
    color: colors.muted,
  },
});

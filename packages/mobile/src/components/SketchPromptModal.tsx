import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Image,
  Switch,
  Platform,
} from 'react-native';
import { Smartphone, Globe, Box, Trees, X, ImagePlus, Plus } from 'lucide-react-native';
import { colors, fonts } from '../lib/theme';
import {
  SKETCH_TEMPLATE_LABELS,
  SKETCH_MAX_DESCRIPTION_LENGTH,
} from '@forge/shared/constants';
import type { SketchTemplateType } from '@forge/shared/constants';

// expo-image-picker has native code — defer loading to avoid crash if native
// module isn't in the current dev client build.
let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Native module not available in this build
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PromptResult {
  templateType: SketchTemplateType;
  description: string;
  features: string[];
  annotations: boolean;
  referenceImageUri: string | null;
  referenceImageMimeType: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onGenerate: (result: PromptResult) => void;
  isLoading: boolean;
  initialValues?: Partial<PromptResult>;
}

// ── Template card definitions ─────────────────────────────────────────────────

const TEMPLATE_ICONS: Record<SketchTemplateType, React.ComponentType<{ size: number; color: string }>> = {
  app_page: Smartphone,
  web_layout: Globe,
  physical_object: Box,
  scene: Trees,
};

const TEMPLATE_TYPES: SketchTemplateType[] = ['app_page', 'web_layout', 'physical_object', 'scene'];

// ── Component ─────────────────────────────────────────────────────────────────

export function SketchPromptModal({ visible, onClose, onGenerate, isLoading, initialValues }: Props) {
  const isEditMode = !!initialValues;

  // Step: 1 = template picker, 2 = prompt inputs
  const [step, setStep] = useState<1 | 2>(isEditMode ? 2 : 1);
  const [templateType, setTemplateType] = useState<SketchTemplateType>(
    initialValues?.templateType ?? 'app_page',
  );
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [features, setFeatures] = useState<string[]>(initialValues?.features ?? []);
  const [featureInput, setFeatureInput] = useState('');
  const [annotations, setAnnotations] = useState(initialValues?.annotations ?? true);
  const [referenceImageUri, setReferenceImageUri] = useState<string | null>(
    initialValues?.referenceImageUri ?? null,
  );
  const [referenceImageMimeType, setReferenceImageMimeType] = useState<string | null>(
    initialValues?.referenceImageMimeType ?? null,
  );

  // Sync state when initialValues changes (e.g. edit mode opens with new values)
  useEffect(() => {
    if (visible && isEditMode) {
      setStep(2);
      setTemplateType(initialValues?.templateType ?? 'app_page');
      setDescription(initialValues?.description ?? '');
      setFeatures(initialValues?.features ?? []);
      setFeatureInput('');
      setAnnotations(initialValues?.annotations ?? true);
      setReferenceImageUri(initialValues?.referenceImageUri ?? null);
      setReferenceImageMimeType(initialValues?.referenceImageMimeType ?? null);
    }
  }, [visible, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetState = useCallback(() => {
    setStep(1);
    setTemplateType('app_page');
    setDescription('');
    setFeatures([]);
    setFeatureInput('');
    setAnnotations(true);
    setReferenceImageUri(null);
    setReferenceImageMimeType(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!isEditMode) {
      resetState();
    }
    onClose();
  }, [isEditMode, onClose, resetState]);

  const handleSelectTemplate = useCallback((type: SketchTemplateType) => {
    setTemplateType(type);
    setStep(2);
  }, []);

  const handleBack = useCallback(() => {
    setStep(1);
  }, []);

  const handleGenerate = useCallback(() => {
    if (!description.trim() || isLoading) return;
    onGenerate({
      templateType,
      description: description.trim(),
      features: features.filter((f) => f.trim().length > 0),
      annotations,
      referenceImageUri,
      referenceImageMimeType,
    });
  }, [templateType, description, annotations, referenceImageUri, referenceImageMimeType, isLoading, onGenerate]);

  const handlePickImage = useCallback(async () => {
    if (!ImagePicker) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setReferenceImageUri(asset.uri);
      // Derive MIME type from extension, default to image/jpeg
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      const mime =
        ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      setReferenceImageMimeType(mime);
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setReferenceImageUri(null);
    setReferenceImageMimeType(null);
  }, []);

  const canGenerate = description.trim().length > 0 && !isLoading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {step === 1 ? 'Choose Template' : SKETCH_TEMPLATE_LABELS[templateType]}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {step === 1 ? (
            // ── Step 1: Template Picker ──────────────────────────────────────
            <View style={styles.templateGrid}>
              {TEMPLATE_TYPES.map((type) => {
                const Icon = TEMPLATE_ICONS[type];
                return (
                  <TouchableOpacity
                    key={type}
                    style={styles.templateCard}
                    onPress={() => handleSelectTemplate(type)}
                    activeOpacity={0.75}
                  >
                    <Icon size={28} color={colors.brand} />
                    <Text style={styles.templateLabel}>
                      {SKETCH_TEMPLATE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            // ── Step 2: Prompt Inputs ────────────────────────────────────────
            <ScrollView
              style={styles.inputsScroll}
              contentContainerStyle={styles.inputsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Description */}
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Describe what you want to sketch…"
                placeholderTextColor={colors.mutedDim}
                value={description}
                onChangeText={setDescription}
                maxLength={SKETCH_MAX_DESCRIPTION_LENGTH}
                multiline
                textAlignVertical="top"
                autoFocus
              />
              <Text style={styles.charCount}>
                {description.length}/{SKETCH_MAX_DESCRIPTION_LENGTH}
              </Text>

              {/* Features */}
              <Text style={styles.fieldLabel}>Features (optional)</Text>
              {features.map((feature, idx) => (
                <View key={idx} style={styles.featureChip}>
                  <Text style={styles.featureChipText} numberOfLines={1}>{feature}</Text>
                  <TouchableOpacity
                    onPress={() => setFeatures((prev) => prev.filter((_, i) => i !== idx))}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <X size={14} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.featureInputRow}>
                <TextInput
                  style={styles.featureInput}
                  placeholder="e.g. ergonomic grip for easy shaking"
                  placeholderTextColor={colors.mutedDim}
                  value={featureInput}
                  onChangeText={setFeatureInput}
                  maxLength={120}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const trimmed = featureInput.trim();
                    if (trimmed && features.length < 10) {
                      setFeatures((prev) => [...prev, trimmed]);
                      setFeatureInput('');
                    }
                  }}
                />
                <TouchableOpacity
                  style={[
                    styles.featureAddBtn,
                    (!featureInput.trim() || features.length >= 10) && styles.featureAddBtnDisabled,
                  ]}
                  onPress={() => {
                    const trimmed = featureInput.trim();
                    if (trimmed && features.length < 10) {
                      setFeatures((prev) => [...prev, trimmed]);
                      setFeatureInput('');
                    }
                  }}
                  disabled={!featureInput.trim() || features.length >= 10}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color={colors.white} />
                </TouchableOpacity>
              </View>

              {/* Reference Image */}
              <Text style={styles.fieldLabel}>Reference Image (optional)</Text>
              {referenceImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: referenceImageUri }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={handleRemoveImage}
                    activeOpacity={0.8}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <X size={14} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addImageBtn}
                  onPress={handlePickImage}
                  activeOpacity={0.75}
                >
                  <ImagePlus size={20} color={colors.muted} />
                  <Text style={styles.addImageText}>Add reference image</Text>
                </TouchableOpacity>
              )}

              {/* Annotations toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextGroup}>
                  <Text style={styles.fieldLabel}>Annotations</Text>
                  <Text style={styles.toggleHint}>
                    Add labels and callouts to your sketch
                  </Text>
                </View>
                <Switch
                  value={annotations}
                  onValueChange={setAnnotations}
                  trackColor={{ false: colors.border, true: colors.brand }}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.border}
                />
              </View>

              {/* Action buttons */}
              <View style={styles.actions}>
                {!isEditMode && (
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={handleBack}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.generateBtn,
                    isEditMode && styles.generateBtnFull,
                    !canGenerate && styles.generateBtnDisabled,
                  ]}
                  onPress={handleGenerate}
                  activeOpacity={0.8}
                  disabled={!canGenerate}
                >
                  <Text style={styles.generateBtnText}>
                    {isLoading ? 'Generating…' : 'Generate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    ...fonts.outfit.bold,
    color: colors.foreground,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Step 1 ──
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  templateCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  templateLabel: {
    fontSize: 14,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
    textAlign: 'center',
  },

  // ── Step 2 ──
  inputsScroll: {
    flexGrow: 0,
  },
  inputsContent: {
    padding: 20,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    ...fonts.outfit.semiBold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  descriptionInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    ...fonts.outfit.regular,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    ...fonts.outfit.regular,
    color: colors.mutedDim,
    textAlign: 'right',
    marginTop: 4,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  featureChipText: {
    flex: 1,
    fontSize: 14,
    ...fonts.outfit.regular,
    color: colors.foreground,
    marginRight: 8,
  },
  featureInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  featureInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    ...fonts.outfit.regular,
    color: colors.foreground,
  },
  featureAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureAddBtnDisabled: {
    opacity: 0.4,
  },
  addImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  addImageText: {
    fontSize: 15,
    ...fonts.outfit.regular,
    color: colors.muted,
  },
  imagePreviewContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 12,
  },
  toggleTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  toggleHint: {
    fontSize: 12,
    ...fonts.outfit.regular,
    color: colors.mutedDim,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {
    fontSize: 15,
    ...fonts.outfit.semiBold,
    color: colors.muted,
  },
  generateBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
  },
  generateBtnFull: {
    flex: 1,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    fontSize: 15,
    ...fonts.outfit.semiBold,
    color: colors.white,
  },
});

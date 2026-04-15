import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { File, Paths } from 'expo-file-system';
// Lazy-load: native module only available after a build that includes the plugin
const getMediaLibrary = (): typeof import('expo-media-library') | null => {
  try {
    return require('expo-media-library');
  } catch {
    return null;
  }
};
import { RefreshCw, Pencil, Pin, Grid3x3, Download, Share2, Trash2, WandSparkles } from 'lucide-react-native';
import { colors, fonts } from '../../../lib/theme';
import { trpc } from '../../../lib/trpc';
import { triggerHaptic } from '../../../components/ui/Button';
import { useAIConsentGate } from '../../../hooks/useAIConsentGate';
import { useToast } from '../../../contexts/ToastContext';
import { SketchPromptModal } from '../../../components/SketchPromptModal';
import { PinSheet } from '../../../components/PinSheet';
import { saveSketch, updateSketchPin } from '../../../lib/sketch-storage';
import type { SketchTemplateType } from '@forge/shared/constants';
import type { PromptResult } from '../../../components/SketchPromptModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CurrentSketch {
  sketchId: string;
  imageUrl: string;
  storagePath: string;
  templateType: SketchTemplateType;
  description: string;
  features: string[];
  aspectRatio: string;
  annotations: boolean;
  referenceImageUri: string | null;
  referenceImageMimeType: string | null;
}

// ── Generation steps ─────────────────────────────────────────────────────────

const GENERATION_STEPS = [
  { label: 'Preparing your prompt', duration: 3000 },
  { label: 'Generating sketch', duration: 20000 },
  { label: 'Uploading image', duration: 4000 },
] as const;

const TIPS = [
  'AI sketches use a hand-drawn marker style',
  'Try adding features for more detailed results',
  'Reference images help guide the composition',
  'Sketches can be pinned to sandboxes or vault ideas',
];

function GeneratingOverlay({ step }: { step: number }) {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, []);

  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <View style={genStyles.container}>
      <ActivityIndicator size="large" color={colors.brand} style={{ marginBottom: 24 }} />

      <View style={genStyles.steps}>
        {GENERATION_STEPS.map((s, i) => {
          const isActive = i === step;
          const isDone = i < step;
          return (
            <View key={s.label} style={genStyles.stepRow}>
              <View style={[
                genStyles.stepDot,
                isDone && genStyles.stepDotDone,
                isActive && genStyles.stepDotActive,
              ]}>
                {isActive && <Animated.View style={[genStyles.stepDotInner, dotStyle]} />}
                {isDone && <View style={genStyles.stepDotInner} />}
              </View>
              <Text style={[
                genStyles.stepLabel,
                isActive && genStyles.stepLabelActive,
                isDone && genStyles.stepLabelDone,
              ]}>
                {s.label}{isActive ? '...' : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={genStyles.tip}>{tip}</Text>
    </View>
  );
}

const genStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 32,
  },
  steps: {
    gap: 14,
    alignSelf: 'stretch',
    paddingHorizontal: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: colors.brand,
  },
  stepDotDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  stepDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  stepLabel: {
    fontSize: 14,
    ...fonts.outfit.regular,
    color: colors.mutedDim,
  },
  stepLabelActive: {
    color: colors.foreground,
    ...fonts.outfit.semiBold,
  },
  stepLabelDone: {
    color: colors.muted,
  },
  tip: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.mutedDim,
    marginTop: 32,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SketchbookScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { checkConsent, ConsentGate } = useAIConsentGate();

  const [showModal, setShowModal] = useState(false);
  const [showPinSheet, setShowPinSheet] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [currentSketch, setCurrentSketch] = useState<CurrentSketch | null>(null);
  const [editMode, setEditMode] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progress through generation steps on timed intervals
  useEffect(() => {
    if (!isGenerating) {
      setGenerationStep(0);
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      return;
    }

    const advanceStep = (current: number) => {
      if (current < GENERATION_STEPS.length - 1) {
        stepTimerRef.current = setTimeout(() => {
          setGenerationStep(current + 1);
          advanceStep(current + 1);
        }, GENERATION_STEPS[current].duration);
      }
    };

    advanceStep(0);
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, [isGenerating]);

  // tRPC mutations
  const getUploadUrl = trpc.attachment.getUploadUrl.useMutation();
  const generateSketch = trpc.sketch.generate.useMutation();
  const pinSketch = trpc.sketch.pin.useMutation();

  // ── Generation ─────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async (result: PromptResult) => {
    setShowModal(false);
    setIsGenerating(true);
    triggerHaptic('medium');

    try {
      let referenceImageKey: string | undefined;

      // Upload reference image if provided
      if (result.referenceImageUri && result.referenceImageMimeType) {
        const mimeType = result.referenceImageMimeType as 'image/jpeg' | 'image/png' | 'image/webp';
        const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
        const fileName = `sketch-ref-${Date.now()}.${ext}`;

        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          fileName,
          mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/heic',
        });

        const response = await fetch(result.referenceImageUri);
        const blob = await response.blob();

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': mimeType },
          body: blob,
        });

        if (uploadResponse.ok) {
          referenceImageKey = storagePath;
        } else {
          showToast({ message: 'Failed to upload reference image', type: 'error' });
        }
      }

      const generated = await generateSketch.mutateAsync({
        templateType: result.templateType,
        description: result.description,
        features: result.features,
        aspectRatio: result.aspectRatio,
        annotations: result.annotations,
        referenceImageKey,
      });

      const sketch: CurrentSketch = {
        sketchId: generated.sketchId,
        imageUrl: generated.imageUrl,
        storagePath: generated.storagePath,
        templateType: result.templateType,
        description: result.description,
        features: result.features,
        aspectRatio: result.aspectRatio,
        annotations: result.annotations,
        referenceImageUri: result.referenceImageUri,
        referenceImageMimeType: result.referenceImageMimeType,
      };

      setCurrentSketch(sketch);
      triggerHaptic('success');

      // Save to local library (best-effort — don't show error if this fails)
      try {
        await saveSketch(
          {
            id: generated.sketchId,
            localImagePath: '',
            remoteImageUrl: generated.imageUrl,
            storagePath: generated.storagePath,
            templateType: result.templateType,
            description: result.description,
            features: result.features,
            annotations: result.annotations,
            pinnedTo: null,
            createdAt: new Date().toISOString(),
          },
          generated.imageUrl,
        );
      } catch {
        // Local cache failure is non-critical
      }
    } catch {
      showToast({ message: 'Sketch generation failed. Please try again.', type: 'error' });
      triggerHaptic('error');
    } finally {
      setIsGenerating(false);
    }
  }, [getUploadUrl, generateSketch, showToast]);

  // ── FAB → open modal ────────────────────────────────────────────────────────

  const handleFabPress = useCallback(async () => {
    const granted = await checkConsent();
    if (!granted) return;
    setEditMode(false);
    setShowModal(true);
  }, [checkConsent]);

  // ── Regenerate ──────────────────────────────────────────────────────────────

  const handleRegenerate = useCallback(async () => {
    if (!currentSketch) return;
    triggerHaptic('medium');
    await handleGenerate({
      templateType: currentSketch.templateType,
      description: currentSketch.description,
      features: currentSketch.features,
      aspectRatio: currentSketch.aspectRatio as any,
      annotations: currentSketch.annotations,
      referenceImageUri: currentSketch.referenceImageUri,
      referenceImageMimeType: currentSketch.referenceImageMimeType,
    });
  }, [currentSketch, handleGenerate]);

  // ── Edit ────────────────────────────────────────────────────────────────────

  const handleEdit = useCallback(() => {
    // Use the generated image as the reference so edits revise the current sketch
    if (currentSketch) {
      setCurrentSketch({
        ...currentSketch,
        referenceImageUri: currentSketch.imageUrl,
        referenceImageMimeType: 'image/png',
      });
    }
    setEditMode(true);
    setShowModal(true);
  }, [currentSketch]);

  // ── Pin ─────────────────────────────────────────────────────────────────────

  const handlePinSelect = useCallback(
    async (target: { type: 'sandbox' | 'vault'; id: string; name: string }) => {
      if (!currentSketch) return;
      triggerHaptic('medium');

      try {
        await pinSketch.mutateAsync({
          imageUrl: currentSketch.imageUrl,
          storagePath: currentSketch.storagePath,
          targetType: target.type,
          targetId: target.id,
        });

        await updateSketchPin(currentSketch.sketchId, {
          type: target.type,
          id: target.id,
          name: target.name,
        });

        triggerHaptic('success');
        showToast({ message: `Pinned to ${target.name}`, type: 'success' });
        setCurrentSketch(null);
      } catch {
        triggerHaptic('error');
        showToast({ message: 'Failed to pin sketch. Please try again.', type: 'error' });
      }
    },
    [currentSketch, pinSketch, showToast],
  );

  // ── Save to camera roll ─────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!currentSketch) return;
    const ml = getMediaLibrary();
    if (!ml) {
      Alert.alert('Unavailable', 'Photo saving requires a new app build. Please update the app.');
      return;
    }
    try {
      const { status } = await ml.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access to save sketches.');
        return;
      }
      // Download to a temp file first, then save to camera roll
      const destination = new File(Paths.cache, `sketch-${currentSketch.sketchId}.png`);
      const downloaded = await File.downloadFileAsync(currentSketch.imageUrl, destination);
      await ml.saveToLibraryAsync(downloaded.uri);
      triggerHaptic('success');
      showToast({ message: 'Saved to Photos', type: 'success' });
    } catch {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to save image to Photos.');
    }
  }, [currentSketch, showToast]);

  // ── Share ──────────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    if (!currentSketch) return;
    try {
      const destination = new File(Paths.cache, `sketch-share-${currentSketch.sketchId}.png`);
      const downloaded = await File.downloadFileAsync(currentSketch.imageUrl, destination);
      await Share.share({ url: downloaded.uri });
    } catch {
      // User cancelled or share failed — no toast needed
    }
  }, [currentSketch]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sketchbook</Text>
        <View style={styles.headerPill}>
          <TouchableOpacity
            style={styles.pillButton}
            onPress={handleSave}
            disabled={!currentSketch}
          >
            <Download size={18} color={currentSketch ? colors.foreground : colors.mutedDim} />
          </TouchableOpacity>
          <View style={styles.pillDivider} />
          <TouchableOpacity
            style={styles.pillButton}
            onPress={handleShare}
            disabled={!currentSketch}
          >
            <Share2 size={18} color={currentSketch ? colors.foreground : colors.mutedDim} />
          </TouchableOpacity>
          <View style={styles.pillDivider} />
          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => router.push('/(tabs)/sketch/library')}
          >
            <Grid3x3 size={18} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.pillDivider} />
          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => setCurrentSketch(null)}
            disabled={!currentSketch}
          >
            <Trash2 size={18} color={currentSketch ? colors.destructive : colors.mutedDim} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas */}
      {isGenerating ? (
        <View style={styles.canvas}>
          <GeneratingOverlay step={generationStep} />
        </View>
      ) : currentSketch ? (
        <View style={styles.canvas}>
          <Image
            source={{ uri: currentSketch.imageUrl }}
            style={styles.sketchImage}
            resizeMode="contain"
          />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.canvas}
          onPress={handleFabPress}
          activeOpacity={0.8}
        >
          <View style={styles.emptyDashedBox}>
            <WandSparkles size={40} color={colors.border} />
          </View>
          <Text style={styles.emptyLabel}>Tap to create a sketch</Text>
        </TouchableOpacity>
      )}

      {/* Action bar — only when sketch is loaded */}
      {currentSketch && !isGenerating && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleRegenerate}
            activeOpacity={0.75}
          >
            <RefreshCw size={16} color={colors.foreground} />
            <Text style={styles.actionBtnText}>Regenerate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleEdit}
            activeOpacity={0.75}
          >
            <Pencil size={16} color={colors.foreground} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.pinBtn]}
            onPress={() => {
              triggerHaptic('light');
              setShowPinSheet(true);
            }}
            activeOpacity={0.75}
          >
            <Pin size={16} color={colors.white} />
            <Text style={[styles.actionBtnText, styles.pinBtnText]}>Pin</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <SketchPromptModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerate}
        isLoading={isGenerating}
        initialValues={
          editMode && currentSketch
            ? {
                templateType: currentSketch.templateType,
                description: currentSketch.description,
                features: currentSketch.features,
                aspectRatio: currentSketch.aspectRatio as any,
                annotations: currentSketch.annotations,
                referenceImageUri: currentSketch.referenceImageUri,
                referenceImageMimeType: currentSketch.referenceImageMimeType,
              }
            : undefined
        }
      />

      <PinSheet
        visible={showPinSheet}
        onClose={() => setShowPinSheet(false)}
        onSelect={handlePinSelect}
      />

      {/* AI consent gate (renders as a bottom sheet when triggered) */}
      {ConsentGate}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    ...fonts.outfit.bold,
    color: colors.foreground,
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
  canvas: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDashedBox: {
    width: 88,
    height: 88,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyLabel: {
    fontSize: 15,
    ...fonts.outfit.regular,
    color: colors.muted,
  },
  sketchImage: {
    width: '100%',
    height: '100%',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: 14,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
  },
  pinBtn: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  pinBtnText: {
    color: colors.white,
  },
});

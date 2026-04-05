import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
// Deferred load — native module may not be available in all builds
let MediaLibrary: typeof import('expo-media-library') | null = null;
try {
  MediaLibrary = require('expo-media-library');
} catch {
  // Native module not available
}
import { Plus, RefreshCw, Pencil, Pin, Grid3x3, Download, Share2, Trash2 } from 'lucide-react-native';
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

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SketchbookScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { checkConsent, ConsentGate } = useAIConsentGate();

  const [showModal, setShowModal] = useState(false);
  const [showPinSheet, setShowPinSheet] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSketch, setCurrentSketch] = useState<CurrentSketch | null>(null);
  const [editMode, setEditMode] = useState(false);

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
    setEditMode(true);
    setShowModal(true);
  }, []);

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
    if (!currentSketch || !MediaLibrary) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast({ message: 'Photo library permission required', type: 'error' });
        return;
      }
      // Download to a temp file first, then save to camera roll
      const localUri = `${FileSystem.cacheDirectory}sketch-${currentSketch.sketchId}.png`;
      const download = await FileSystem.downloadAsync(currentSketch.imageUrl, localUri);
      await MediaLibrary.saveToLibraryAsync(download.uri);
      triggerHaptic('success');
      showToast({ message: 'Saved to Photos', type: 'success' });
    } catch {
      triggerHaptic('error');
      showToast({ message: 'Failed to save image', type: 'error' });
    }
  }, [currentSketch, showToast]);

  // ── Share ──────────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    if (!currentSketch) return;
    try {
      const localUri = `${FileSystem.cacheDirectory}sketch-share-${currentSketch.sketchId}.png`;
      await FileSystem.downloadAsync(currentSketch.imageUrl, localUri);
      await Share.share({ url: localUri });
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
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!currentSketch}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Download size={20} color={currentSketch ? colors.foreground : colors.mutedDim} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            disabled={!currentSketch}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Share2 size={20} color={currentSketch ? colors.foreground : colors.mutedDim} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCurrentSketch(null)}
            disabled={!currentSketch}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={20} color={currentSketch ? colors.destructive : colors.mutedDim} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/sketch/library')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Grid3x3 size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas */}
      <View style={styles.canvas}>
        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={styles.loadingText}>Sketching...</Text>
          </View>
        ) : currentSketch ? (
          <Image
            source={{ uri: currentSketch.imageUrl }}
            style={styles.sketchImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Pencil size={56} color={colors.border} />
          </View>
        )}
      </View>

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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.85}>
        <Plus size={28} color={colors.white} />
      </TouchableOpacity>

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
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
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});

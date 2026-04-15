import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, Download, Share2, Pin, Trash2, X } from 'lucide-react-native';
import { File, Paths } from 'expo-file-system';
import { colors, fonts } from '../../../lib/theme';
import { getAllSketches, deleteSketch, updateSketchPin, type LocalSketch } from '../../../lib/sketch-storage';
import { triggerHaptic } from '../../../components/ui/Button';
import { useToast } from '../../../contexts/ToastContext';
import { PinSheet } from '../../../components/PinSheet';
import { trpc } from '../../../lib/trpc';
// Lazy-load: native module only available after a build that includes the plugin
const getMediaLibrary = (): typeof import('expo-media-library') | null => {
  try {
    return require('expo-media-library');
  } catch {
    return null;
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMNS = 3;
const GAP = 4;
const THUMB_SIZE = (SCREEN_WIDTH - 40 - GAP * (COLUMNS - 1)) / COLUMNS;

export default function LibraryScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [sketches, setSketches] = useState<LocalSketch[]>([]);
  const [selected, setSelected] = useState<LocalSketch | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [showPinSheet, setShowPinSheet] = useState(false);

  const pinSketch = trpc.sketch.pin.useMutation();

  useFocusEffect(
    useCallback(() => {
      getAllSketches().then(setSketches);
    }, []),
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback((sketch: LocalSketch) => {
    Alert.alert('Delete Sketch', 'Remove this sketch from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSketch(sketch.id);
          setSketches((prev) => prev.filter((s) => s.id !== sketch.id));
          setSelected(null);
          triggerHaptic('success');
        },
      },
    ]);
  }, []);

  const getLocalFile = useCallback(async (sketch: LocalSketch): Promise<string> => {
    // If we have a local path, verify it exists via the File class
    if (sketch.localImagePath) {
      const file = new File(sketch.localImagePath);
      if (file.exists) return file.uri;
    }
    // Otherwise download to cache
    const destination = new File(Paths.cache, `sketch-${sketch.id}.png`);
    const downloaded = await File.downloadFileAsync(sketch.remoteImageUrl, destination);
    return downloaded.uri;
  }, []);

  const handleSave = useCallback(async (sketch: LocalSketch) => {
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
      const uri = await getLocalFile(sketch);
      await ml.saveToLibraryAsync(uri);
      triggerHaptic('success');
      // Close modal first so toast is visible (Modal renders above toast layer)
      setPreviewVisible(false);
      setSelected(null);
      showToast({ message: 'Saved to Photos', type: 'success' });
    } catch {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to save image to Photos.');
    }
  }, [showToast, getLocalFile]);

  const handleShare = useCallback(async (sketch: LocalSketch) => {
    try {
      const uri = await getLocalFile(sketch);
      await Share.share({ url: uri });
    } catch {
      // User cancelled or share failed
    }
  }, [getLocalFile]);

  const handlePinSelect = useCallback(
    async (target: { type: 'sandbox' | 'vault'; id: string; name: string }) => {
      if (!selected) return;
      triggerHaptic('medium');

      try {
        await pinSketch.mutateAsync({
          imageUrl: selected.remoteImageUrl,
          storagePath: selected.storagePath,
          targetType: target.type,
          targetId: target.id,
        });

        await updateSketchPin(selected.id, {
          type: target.type,
          id: target.id,
          name: target.name,
        });

        // Update local state
        setSketches((prev) =>
          prev.map((s) =>
            s.id === selected.id
              ? { ...s, pinnedTo: { type: target.type, id: target.id, name: target.name } }
              : s,
          ),
        );
        setSelected((prev) =>
          prev ? { ...prev, pinnedTo: { type: target.type, id: target.id, name: target.name } } : null,
        );

        triggerHaptic('success');
        showToast({ message: `Pinned to ${target.name}`, type: 'success' });
        setShowPinSheet(false);
        setPreviewVisible(false);
        setSelected(null);
      } catch {
        triggerHaptic('error');
        showToast({ message: 'Failed to pin sketch', type: 'error' });
      }
    },
    [selected, pinSketch, showToast],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: LocalSketch }) => (
      <TouchableOpacity
        style={styles.thumb}
        onPress={() => { setSelected(item); setPreviewVisible(true); }}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.localImagePath || item.remoteImageUrl }}
          style={styles.thumbImage}
        />
        {item.pinnedTo && (
          <View style={styles.pinnedBadge}>
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}
      </TouchableOpacity>
    ),
    [],
  );

  return (
    <View style={styles.container}>
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
        <Text style={styles.headerTitle}>Library</Text>
      </View>

      {sketches.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No sketches yet</Text>
          <Text style={styles.emptyHint}>Generated sketches will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={sketches}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Full-screen preview modal */}
      {selected && (
        <Modal
          visible={previewVisible}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => { setPreviewVisible(false); setSelected(null); }}
        >
          <View style={styles.previewOverlay}>
            {/* Close */}
            <TouchableOpacity
              style={styles.previewClose}
              onPress={() => { setPreviewVisible(false); setSelected(null); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={colors.white} />
            </TouchableOpacity>

            {/* Image */}
            <Image
              source={{ uri: selected.localImagePath || selected.remoteImageUrl }}
              style={styles.previewImage}
              resizeMode="contain"
            />

            {/* Info */}
            {selected.pinnedTo && (
              <View style={styles.previewPinnedBadge}>
                <Pin size={12} color={colors.white} />
                <Text style={styles.previewPinnedText}>{selected.pinnedTo.name}</Text>
              </View>
            )}

            {/* Action bar */}
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewActionBtn}
                onPress={() => handleSave(selected)}
              >
                <Download size={20} color={colors.foreground} />
                <Text style={styles.previewActionLabel}>Save</Text>
              </TouchableOpacity>

              <View style={styles.previewDivider} />

              <TouchableOpacity
                style={styles.previewActionBtn}
                onPress={() => handleShare(selected)}
              >
                <Share2 size={20} color={colors.foreground} />
                <Text style={styles.previewActionLabel}>Share</Text>
              </TouchableOpacity>

              <View style={styles.previewDivider} />

              <TouchableOpacity
                style={styles.previewActionBtn}
                onPress={() => setShowPinSheet(true)}
              >
                <Pin size={20} color={colors.foreground} />
                <Text style={styles.previewActionLabel}>Pin</Text>
              </TouchableOpacity>

              <View style={styles.previewDivider} />

              <TouchableOpacity
                style={styles.previewActionBtn}
                onPress={() => handleDelete(selected)}
              >
                <Trash2 size={20} color={colors.destructive} />
                <Text style={[styles.previewActionLabel, { color: colors.destructive }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          <PinSheet
            visible={showPinSheet}
            onClose={() => setShowPinSheet(false)}
            onSelect={handlePinSelect}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
  },
  listContent: {
    padding: 20,
    gap: GAP,
  },
  row: {
    gap: GAP,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  pinnedBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pinnedText: {
    fontSize: 10,
    color: colors.white,
    ...fonts.outfit.medium,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 17,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },

  // ── Preview modal ──────────────────────────────────────────────────────────
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  previewImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 12,
  },
  previewPinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewPinnedText: {
    fontSize: 13,
    color: colors.white,
    ...fonts.outfit.medium,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'absolute',
    bottom: 60,
  },
  previewActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 4,
  },
  previewActionLabel: {
    fontSize: 11,
    ...fonts.outfit.medium,
    color: colors.foreground,
  },
  previewDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
});

import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, fonts } from '../lib/theme';

const DEFAULT_MAX_ATTACHMENTS = 5;
const THUMB_SIZE = 72;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface LocalAttachment {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface ThumbnailStripProps {
  attachments: LocalAttachment[];
  onRemove: (index: number) => void;
  maxAttachments?: number;
}

export function ThumbnailStrip({ attachments, onRemove, maxAttachments = DEFAULT_MAX_ATTACHMENTS }: ThumbnailStripProps) {
  const [expandedUri, setExpandedUri] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {attachments.map((att, i) => (
          <View key={att.uri} style={styles.thumbnailWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setExpandedUri(att.uri)}
            >
              <Image source={{ uri: att.uri }} style={styles.thumbnail} resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(i)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <X size={10} color="#fff" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.counter}>
        {attachments.length}/{maxAttachments}
      </Text>

      <Modal
        visible={expandedUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedUri(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setExpandedUri(null)}>
          <Image
            source={{ uri: expandedUri ?? undefined }}
            style={styles.expandedImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setExpandedUri(null)}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <X size={22} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    gap: 8,
  },
  scroll: {
    flexGrow: 0,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 10,
    padding: 4,
  },
  thumbnail: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    color: colors.mutedDim,
    fontSize: 12,
    ...fonts.geist.regular,
    marginLeft: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.7,
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

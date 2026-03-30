import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Text,
  StyleSheet,
} from 'react-native';
import { colors, fonts } from '../lib/theme';

const MAX_ATTACHMENTS = 5;

export interface LocalAttachment {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface ThumbnailStripProps {
  attachments: LocalAttachment[];
  onRemove: (index: number) => void;
}

export function ThumbnailStrip({ attachments, onRemove }: ThumbnailStripProps) {
  if (attachments.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {attachments.map((att, i) => (
          <View key={att.uri} style={styles.thumbnailWrapper}>
            <Image source={{ uri: att.uri }} style={styles.thumbnail} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(i)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.removeText}>x</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.counter}>
        {attachments.length}/{MAX_ATTACHMENTS}
      </Text>
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
    marginRight: 8,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 13,
  },
  counter: {
    color: colors.mutedDim,
    fontSize: 12,
    ...fonts.geist.regular,
    marginLeft: 4,
  },
});

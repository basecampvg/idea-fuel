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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors, fonts } from '../../../lib/theme';
import { getAllSketches, deleteSketch, type LocalSketch } from '../../../lib/sketch-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMNS = 3;
const GAP = 4;
const THUMB_SIZE = (SCREEN_WIDTH - 40 - GAP * (COLUMNS - 1)) / COLUMNS;

export default function LibraryScreen() {
  const [sketches, setSketches] = useState<LocalSketch[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllSketches().then(setSketches);
    }, []),
  );

  const handleDelete = useCallback((sketch: LocalSketch) => {
    Alert.alert('Delete Sketch', 'Remove this sketch from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSketch(sketch.id);
          setSketches((prev) => prev.filter((s) => s.id !== sketch.id));
        },
      },
    ]);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: LocalSketch }) => (
      <TouchableOpacity
        style={styles.thumb}
        onLongPress={() => handleDelete(item)}
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
    [handleDelete],
  );

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
});

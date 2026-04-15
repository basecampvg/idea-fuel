import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { colors, fonts } from '../../lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Reaction {
  emoji: string;
  count: number;
}

interface ReactionsRowProps {
  reactions: Reaction[];
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
}

const AVAILABLE_EMOJIS = ['🔥', '⭐', '🤔', '🚫', '💡'];

export function ReactionsRow({
  reactions,
  onAddReaction,
  onRemoveReaction,
}: ReactionsRowProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const togglePicker = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPickerVisible(!pickerVisible);
  };

  const handlePickEmoji = (emoji: string) => {
    onAddReaction(emoji);
    setPickerVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {reactions.map((reaction) => (
          <Pressable
            key={reaction.emoji}
            style={styles.reactionPill}
            onPress={() => onAddReaction(reaction.emoji)}
            onLongPress={() => onRemoveReaction(reaction.emoji)}
          >
            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            <Text style={styles.reactionCount}>{'\u00d7'}{reaction.count}</Text>
          </Pressable>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={togglePicker}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+ React</Text>
        </TouchableOpacity>
      </View>

      {pickerVisible && (
        <View style={styles.pickerRow}>
          {AVAILABLE_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.pickerEmoji}
              onPress={() => handlePickEmoji(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerEmojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    color: colors.muted,
    fontSize: 13,
    ...fonts.text.medium,
  },
  addButton: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButtonText: {
    color: colors.muted,
    fontSize: 13,
    ...fonts.text.medium,
  },
  pickerRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  pickerEmoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerEmojiText: {
    fontSize: 22,
  },
});

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FileText } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

/**
 * Inline chip rendered in the capture flow (and optionally elsewhere) that lets
 * the user file a capture as a `note` instead of a `thought`. Notes are exempt
 * from the idea engine — they don't enter collision detection, resurfacing,
 * AI classification, or clustering. Framed as filing, not idea-evaluation.
 */
export function NoteFilingChip({
  isNote,
  onToggle,
}: {
  isNote: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[styles.chip, isNote && styles.chipActive]}
      activeOpacity={0.7}
      accessibilityLabel={isNote ? 'Filing as note' : 'File as note'}
    >
      <FileText size={14} color={isNote ? colors.brand : colors.muted} />
      <Text style={[styles.text, isNote && styles.textActive]}>
        {isNote ? 'Filing as note' : 'File as note'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandMuted,
  },
  text: { ...fonts.outfit.medium, fontSize: 12, color: colors.muted },
  textActive: { color: colors.brand },
});

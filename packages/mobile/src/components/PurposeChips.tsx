import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lightbulb, FileText } from 'lucide-react-native';
import { colors, fonts } from '../lib/theme';

export type Purpose = 'idea' | 'note';

const PURPOSE_OPTIONS: { value: Purpose; label: string; color: string; Icon: typeof Lightbulb }[] = [
  { value: 'idea', label: 'Idea', color: '#F59E0B', Icon: Lightbulb },
  { value: 'note', label: 'Note', color: '#6B7280', Icon: FileText },
];

export function PurposeChips({
  selected,
  onSelect,
}: {
  selected: Purpose;
  onSelect: (purpose: Purpose) => void;
}) {
  return (
    <View style={styles.container}>
      {PURPOSE_OPTIONS.map(({ value, label, color, Icon }) => {
        const isActive = selected === value;
        return (
          <TouchableOpacity
            key={value}
            style={[
              styles.chip,
              isActive && { backgroundColor: `${color}20`, borderColor: color },
            ]}
            onPress={() => onSelect(value)}
            activeOpacity={0.7}
          >
            <Icon size={14} color={isActive ? color : colors.mutedDim} />
            <Text style={[styles.label, isActive && { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: 13,
    ...fonts.text.regular,
    color: colors.muted,
  },
});

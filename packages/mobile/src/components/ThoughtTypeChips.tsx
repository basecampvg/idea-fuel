import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, fonts } from '../lib/theme';

export type ThoughtType = 'problem' | 'solution' | 'what_if' | 'observation' | 'question';

const THOUGHT_TYPES: { type: ThoughtType; label: string; color: string }[] = [
  { type: 'problem', label: 'Problem', color: '#EF4444' },
  { type: 'solution', label: 'Solution', color: '#10B981' },
  { type: 'what_if', label: 'What If', color: '#8B5CF6' },
  { type: 'observation', label: 'Observation', color: '#3B82F6' },
  { type: 'question', label: 'Question', color: '#F59E0B' },
];

export function ThoughtTypeChips({
  selected,
  onSelect,
}: {
  selected: ThoughtType | null;
  onSelect: (type: ThoughtType | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {THOUGHT_TYPES.map(({ type, label, color }) => {
        const isActive = selected === type;
        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.chip,
              isActive && { backgroundColor: `${color}20`, borderColor: color },
            ]}
            onPress={() => onSelect(isActive ? null : type)}
            activeOpacity={0.7}
          >
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.label, isActive && { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
  },
});

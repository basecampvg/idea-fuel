import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Lightbulb, FileText } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { BottomSheet } from '../ui/BottomSheet';

export type Purpose = 'idea' | 'note';

const PURPOSE_OPTIONS: { value: Purpose; label: string; color: string; Icon: typeof Lightbulb; description: string }[] = [
  { value: 'idea', label: 'Idea', color: '#F59E0B', Icon: Lightbulb, description: 'Part of the ideation pipeline. Gets resurfaced and scored.' },
  { value: 'note', label: 'Note', color: '#6B7280', Icon: FileText, description: 'General capture. Skips resurfacing and scoring.' },
];

interface PurposePickerProps {
  visible: boolean;
  onClose: () => void;
  current: Purpose;
  onSelect: (purpose: Purpose) => void;
}

export function PurposePicker({ visible, onClose, current, onSelect }: PurposePickerProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Purpose">
      <View style={styles.options}>
        {PURPOSE_OPTIONS.map(({ value, label, color, Icon, description }) => {
          const isSelected = current === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.option, isSelected && { backgroundColor: `${color}15` }]}
              onPress={() => {
                onSelect(value);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon size={20} color={color} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.label, { color }]}>{label}</Text>
                <Text style={styles.description}>{description}</Text>
              </View>
              {isSelected && <Check size={18} color={color} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  options: { gap: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  iconContainer: { width: 28, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
  label: { fontSize: 15, ...fonts.text.semiBold },
  description: { fontSize: 13, ...fonts.text.regular, color: colors.muted },
});

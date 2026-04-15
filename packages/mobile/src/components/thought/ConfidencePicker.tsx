import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Brain, BookOpen, CheckCircle } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { BottomSheet } from '../ui/BottomSheet';

export type ConfidenceLevel = 'untested' | 'researched' | 'validated';

const CONFIDENCE_OPTIONS: {
  level: ConfidenceLevel;
  label: string;
  color: string;
  Icon: LucideIcon;
  description: string;
}[] = [
  { level: 'untested', label: 'Untested', color: '#6B7280', Icon: Brain, description: 'Gut feeling. No evidence beyond intuition.' },
  { level: 'researched', label: 'Researched', color: '#3B82F6', Icon: BookOpen, description: 'Looked into it. Read articles, checked competitors.' },
  { level: 'validated', label: 'Validated', color: '#10B981', Icon: CheckCircle, description: 'External evidence confirms. Interviews, data, tests.' },
];

interface ConfidencePickerProps {
  visible: boolean;
  onClose: () => void;
  current: ConfidenceLevel;
  onSelect: (level: ConfidenceLevel) => void;
}

export function ConfidencePicker({ visible, onClose, current, onSelect }: ConfidencePickerProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Confidence Level">
      <View style={styles.options}>
        {CONFIDENCE_OPTIONS.map(({ level, label, color, Icon, description }) => {
          const isSelected = current === level;
          return (
            <TouchableOpacity
              key={level}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => {
                onSelect(level);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon size={20} color={isSelected ? colors.accent : color} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
                <Text style={styles.description}>{description}</Text>
              </View>
              {isSelected && <Check size={18} color={colors.accent} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  optionSelected: {
    backgroundColor: `${colors.accent}15`,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
  },
  labelSelected: {
    color: colors.accent,
  },
  description: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
  },
});

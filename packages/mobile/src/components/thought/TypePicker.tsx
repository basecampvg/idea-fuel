import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Flame, Lightbulb, Sparkles, Eye, HelpCircle } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { BottomSheet } from '../ui/BottomSheet';

export type ThoughtType = 'problem' | 'solution' | 'what_if' | 'observation' | 'question';

const TYPE_OPTIONS: {
  type: ThoughtType;
  label: string;
  color: string;
  Icon: LucideIcon;
  description: string;
}[] = [
  { type: 'problem', label: 'Problem', color: '#EF4444', Icon: Flame, description: 'A pain point, frustration, or inefficiency.' },
  { type: 'solution', label: 'Solution', color: '#10B981', Icon: Lightbulb, description: 'A proposed approach or mechanism.' },
  { type: 'what_if', label: 'What If', color: '#8B5CF6', Icon: Sparkles, description: 'Speculative or hypothetical. Exploratory.' },
  { type: 'observation', label: 'Observation', color: '#3B82F6', Icon: Eye, description: 'A trend, behavior, or market signal.' },
  { type: 'question', label: 'Question', color: '#F59E0B', Icon: HelpCircle, description: 'An open question to research further.' },
];

interface TypePickerProps {
  visible: boolean;
  onClose: () => void;
  current: ThoughtType;
  onSelect: (type: ThoughtType) => void;
}

export function TypePicker({ visible, onClose, current, onSelect }: TypePickerProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Thought Type">
      <View style={styles.options}>
        {TYPE_OPTIONS.map(({ type, label, color, Icon, description }) => {
          const isSelected = current === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.option, isSelected && { backgroundColor: `${color}15` }]}
              onPress={() => {
                onSelect(type);
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
  },
  description: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
  },
});

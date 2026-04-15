import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { BottomSheet } from '../ui/BottomSheet';

export type MaturityLevel = 'spark' | 'developing' | 'hypothesis' | 'conviction';

const MATURITY_OPTIONS: {
  level: MaturityLevel;
  label: string;
  color: string;
  icon: string;
  description: string;
}[] = [
  { level: 'spark', label: 'Spark', color: '#6B7280', icon: '○', description: 'Raw, unexamined. Just captured.' },
  { level: 'developing', label: 'Developing', color: '#3B82F6', icon: '◐', description: 'Engaged with at least once. Some refinement.' },
  { level: 'hypothesis', label: 'Hypothesis', color: '#F59E0B', icon: '●', description: 'Testable proposition. Enough to validate.' },
  { level: 'conviction', label: 'Conviction', color: '#10B981', icon: '◉', description: 'High confidence. Backed by evidence.' },
];

interface MaturityPickerProps {
  visible: boolean;
  onClose: () => void;
  current: MaturityLevel;
  onSelect: (level: MaturityLevel) => void;
}

export function MaturityPicker({ visible, onClose, current, onSelect }: MaturityPickerProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Maturity Level">
      <View style={styles.options}>
        {MATURITY_OPTIONS.map(({ level, label, color, icon, description }) => {
          const isSelected = current === level;
          return (
            <TouchableOpacity
              key={level}
              style={[styles.option, isSelected && { backgroundColor: `${color}15` }]}
              onPress={() => {
                onSelect(level);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.icon, { color }]}>{icon}</Text>
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
  icon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
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

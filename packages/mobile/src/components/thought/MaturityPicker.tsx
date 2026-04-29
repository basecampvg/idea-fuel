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
  dotStyle: 'hollow' | 'half' | 'filled' | 'ring';
  description: string;
}[] = [
  { level: 'spark', label: 'Spark', color: '#6B7280', dotStyle: 'hollow', description: 'Raw, unexamined. Just captured.' },
  { level: 'developing', label: 'Developing', color: '#3B82F6', dotStyle: 'half', description: 'Engaged with at least once. Some refinement.' },
  { level: 'hypothesis', label: 'Hypothesis', color: '#F59E0B', dotStyle: 'filled', description: 'Testable proposition. Enough to validate.' },
  { level: 'conviction', label: 'Conviction', color: '#10B981', dotStyle: 'ring', description: 'High confidence. Backed by evidence.' },
];

function MaturityDot({ color, style }: { color: string; style: 'hollow' | 'half' | 'filled' | 'ring' }) {
  if (style === 'hollow') {
    return <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: color }} />;
  }
  if (style === 'half') {
    return <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, opacity: 0.5 }} />;
  }
  if (style === 'ring') {
    return (
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      </View>
    );
  }
  // filled
  return <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color }} />;
}

interface MaturityPickerProps {
  visible: boolean;
  onClose: () => void;
  current: MaturityLevel | null;
  onSelect: (level: MaturityLevel | null) => void;
}

export function MaturityPicker({ visible, onClose, current, onSelect }: MaturityPickerProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Maturity Level">
      <View style={styles.options}>
        <TouchableOpacity
          style={[styles.option, current === null && { backgroundColor: `${colors.mutedDim}15` }]}
          onPress={() => {
            onSelect(null);
            onClose();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.mutedDim, borderStyle: 'dashed' }} />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.label, { color: colors.mutedDim }]}>None</Text>
            <Text style={styles.description}>No maturity level assigned.</Text>
          </View>
          {current === null && <Check size={18} color={colors.mutedDim} />}
        </TouchableOpacity>
        {MATURITY_OPTIONS.map(({ level, label, color, dotStyle, description }) => {
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
              <View style={styles.iconContainer}>
                <MaturityDot color={color} style={dotStyle} />
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

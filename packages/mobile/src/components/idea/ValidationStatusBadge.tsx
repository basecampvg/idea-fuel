import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../lib/theme';

export type ValidationStatus = 'draft' | 'in_validation' | 'validated' | 'killed' | 'returned';

const META: Record<ValidationStatus, { label: string; color: string; bg: string }> = {
  draft:         { label: 'Draft',         color: colors.muted,       bg: 'rgba(255,255,255,0.08)' },
  in_validation: { label: 'In Validation', color: colors.warning,     bg: 'rgba(245,158,11,0.15)' },
  validated:     { label: 'Validated',     color: colors.success,     bg: 'rgba(3,147,248,0.15)' },
  killed:        { label: 'Killed',        color: colors.destructive, bg: 'rgba(220,38,38,0.15)' },
  returned:      { label: 'Returned',      color: colors.brand,       bg: colors.brandMuted },
};

export function ValidationStatusBadge({ status }: { status: ValidationStatus }) {
  const meta = META[status] ?? META.draft;
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  label: {
    ...fonts.outfit.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

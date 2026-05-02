import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

type Status = 'exploring' | 'forming' | 'ready';

/**
 * CrystallizeCTA — Crystallize button at the bottom of cluster detail.
 *
 * Always visible, always tappable. The user decides when they're ready;
 * the system never gates the action. Visual prominence varies subtly by
 * cluster maturity:
 *
 *  exploring / forming: outline (secondary) — present but quiet
 *  ready:               filled red (primary) — clearly the obvious next step
 *
 * Brand rationale: ideas are grown, not gated. The user picks the moment
 * to crystallize. The system surfaces what's missing via the Questions
 * panel; it doesn't disable the next step.
 */
export function CrystallizeCTA({
  status,
  onPress,
}: {
  status: Status;
  onPress: () => void;
}) {
  const isPrimary = status === 'ready';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.button, isPrimary ? styles.primary : styles.secondary]}
    >
      <Sparkles size={18} color={isPrimary ? '#FFF' : colors.brand} />
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
        Crystallize
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.brand },
  label: { ...fonts.outfit.bold, fontSize: 15 },
  labelPrimary: { color: '#FFF' },
  labelSecondary: { color: colors.brand },
});

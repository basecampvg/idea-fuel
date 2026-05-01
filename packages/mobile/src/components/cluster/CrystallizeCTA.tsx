import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

type Status = 'exploring' | 'forming' | 'ready';

/**
 * CrystallizeCTA — primary call-to-action at the bottom of cluster detail.
 *
 *  exploring: hidden          (cluster too thin to crystallize meaningfully)
 *  forming:   secondary style ('Keep growing') — encourages adding more
 *  ready:     primary style   ('Crystallize')  — the moment of intent
 */
export function CrystallizeCTA({
  status,
  onPress,
}: {
  status: Status;
  onPress: () => void;
}) {
  if (status === 'exploring') return null;

  const isPrimary = status === 'ready';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.button, isPrimary ? styles.primary : styles.secondary]}
    >
      <Sparkles size={18} color={isPrimary ? '#FFF' : colors.brand} />
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
        {isPrimary ? 'Crystallize' : 'Keep growing'}
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

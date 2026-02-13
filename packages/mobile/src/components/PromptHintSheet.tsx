import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheet } from './ui/BottomSheet';

// ideationLab Design System Colors
const colors = {
  foreground: '#E8E4DC',
  muted: '#8A8680',
  primary: '#E91E8C',
  accent: '#14B8A6',
};

interface HintItem {
  label: string;
  description: string;
}

const hints: HintItem[] = [
  { label: 'Idea', description: 'Your core concept' },
  { label: 'Problem', description: 'What pain point does it solve?' },
  { label: 'Core use cases', description: '2-3 primary ways users would use it' },
  { label: 'Target users', description: 'Who is this for?' },
  { label: 'Business model', description: 'How might it make money?' },
];

interface PromptHintSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function PromptHintSheet({ visible, onClose }: PromptHintSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="For best results, include:"
    >
      <View style={styles.container}>
        {hints.map((hint, index) => (
          <View key={hint.label} style={styles.hintRow}>
            <View style={styles.bullet}>
              <View style={styles.bulletDot} />
            </View>
            <View style={styles.hintContent}>
              <Text style={styles.hintLabel}>{hint.label}:</Text>
              <Text style={styles.hintDescription}> {hint.description}</Text>
            </View>
          </View>
        ))}

        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>
            The more detail you provide, the better your analysis will be.
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    width: 20,
    paddingTop: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  hintContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hintLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  hintDescription: {
    fontSize: 14,
    color: colors.muted,
  },
  tipContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(138, 134, 128, 0.2)',
  },
  tipText: {
    fontSize: 13,
    color: colors.accent,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

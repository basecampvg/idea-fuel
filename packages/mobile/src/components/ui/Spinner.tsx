import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

// ideationLab Design System Colors
const colors = {
  background: '#11100E',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
};

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export function Spinner({ size = 'large', color = colors.primary }: SpinnerProps) {
  return <ActivityIndicator size={size} color={color} />;
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingSpinner}>
        <Spinner size="large" />
      </View>
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

// Thinking indicator (matching web interview UI)
export function ThinkingIndicator() {
  return (
    <View style={styles.thinkingContainer}>
      <View style={[styles.thinkingDot, { animationDelay: '0ms' }]} />
      <View style={[styles.thinkingDot, { animationDelay: '150ms' }]} />
      <View style={[styles.thinkingDot, { animationDelay: '300ms' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  thinkingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});

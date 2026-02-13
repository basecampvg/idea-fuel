import React from 'react';
import { View, Text, ViewProps, StyleSheet, ViewStyle, TextStyle } from 'react-native';

// ideationLab Design System Colors
const colors = {
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  primary: '#E91E8C',
  accent: '#14B8A6',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  destructive: '#EF4444',
  // Status colors
  statusDraft: '#A1A1AA',
  statusInterview: '#FBBF24',
  statusResearch: '#60A5FA',
  statusComplete: '#34D399',
};

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent';

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

interface VariantStyle {
  container: ViewStyle;
  text: TextStyle;
}

const variantStyles: Record<BadgeVariant, VariantStyle> = {
  default: {
    container: { backgroundColor: colors.mutedBg },
    text: { color: colors.muted },
  },
  success: {
    container: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
    text: { color: colors.success },
  },
  warning: {
    container: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
    text: { color: colors.warning },
  },
  error: {
    container: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
    text: { color: colors.destructive },
  },
  info: {
    container: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
    text: { color: colors.info },
  },
  primary: {
    container: { backgroundColor: 'rgba(233, 30, 140, 0.2)' },
    text: { color: colors.primary },
  },
  accent: {
    container: { backgroundColor: 'rgba(20, 184, 166, 0.2)' },
    text: { color: colors.accent },
  },
};

export function Badge({ variant = 'default', children, style, ...props }: BadgeProps) {
  const variantStyle = variantStyles[variant];

  return (
    <View
      style={[styles.badge, variantStyle.container, style]}
      {...props}
    >
      <Text style={[styles.badgeText, variantStyle.text]}>
        {children}
      </Text>
    </View>
  );
}

// Status dot component for idea cards (matching web design)
interface StatusDotProps {
  status: 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';
  size?: 'sm' | 'md';
}

const statusColorMap: Record<string, string> = {
  CAPTURED: colors.statusDraft,
  INTERVIEWING: colors.statusInterview,
  RESEARCHING: colors.statusResearch,
  COMPLETE: colors.statusComplete,
};

export function StatusDot({ status, size = 'md' }: StatusDotProps) {
  const dotSize = size === 'sm' ? 6 : 8;

  return (
    <View
      style={[
        styles.statusDot,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: statusColorMap[status] || statusColorMap.CAPTURED,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusDot: {
    // Base styles - size and color applied dynamically
  },
});

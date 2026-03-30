import React from 'react';
import { View, Text, ViewProps, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, fonts } from '../../lib/theme';

const localColors = {
  mutedBg: '#1A1A1A',
  info: '#3B82F6',
  statusDraft: '#A1A1AA',
  statusInterview: '#FBBF24',
  statusResearch: '#60A5FA',
  statusComplete: '#0393F8',
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
    container: { backgroundColor: localColors.mutedBg },
    text: { color: colors.muted },
  },
  success: {
    container: { backgroundColor: 'rgba(3, 147, 248, 0.2)' },
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
    text: { color: localColors.info },
  },
  primary: {
    container: { backgroundColor: colors.brandMuted },
    text: { color: colors.brand },
  },
  accent: {
    container: { backgroundColor: 'rgba(3, 147, 248, 0.2)' },
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
  CAPTURED: localColors.statusDraft,
  INTERVIEWING: localColors.statusInterview,
  RESEARCHING: localColors.statusResearch,
  COMPLETE: localColors.statusComplete,
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
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    ...fonts.outfit.semiBold,
  },
  statusDot: {
    // Base styles - size and color applied dynamically
  },
});

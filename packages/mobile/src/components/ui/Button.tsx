import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors as theme, fonts } from '../../lib/theme';

const colors = {
  primary: theme.brand,
  secondary: theme.brandEnd,
  accent: theme.accent,
  destructive: theme.destructive,
  foreground: theme.foreground,
  muted: theme.muted,
  mutedBg: theme.surface,
  border: theme.border,
  transparent: 'transparent',
};

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type HapticStyle = 'none' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

// Default haptic feedback for each variant
const variantHaptics: Record<ButtonVariant, HapticStyle> = {
  primary: 'medium',
  secondary: 'medium',
  accent: 'medium',
  outline: 'light',
  ghost: 'light',
  danger: 'heavy',
};

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  /** Haptic feedback style. Defaults based on variant. Set to 'none' to disable. */
  haptic?: HapticStyle;
}

interface VariantStyle {
  container: ViewStyle;
  text: TextStyle;
  loader: string;
}

const variantStyles: Record<ButtonVariant, VariantStyle> = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: '#FFFFFF' },
    loader: '#FFFFFF',
  },
  secondary: {
    container: { backgroundColor: colors.secondary },
    text: { color: '#FFFFFF' },
    loader: '#FFFFFF',
  },
  accent: {
    container: { backgroundColor: colors.accent },
    text: { color: '#FFFFFF' },
    loader: '#FFFFFF',
  },
  outline: {
    container: { backgroundColor: colors.transparent, borderWidth: 1, borderColor: colors.border },
    text: { color: colors.foreground },
    loader: colors.foreground,
  },
  ghost: {
    container: { backgroundColor: colors.transparent },
    text: { color: colors.muted },
    loader: colors.muted,
  },
  danger: {
    container: { backgroundColor: colors.destructive },
    text: { color: '#FFFFFF' },
    loader: '#FFFFFF',
  },
};

interface SizeStyle {
  container: ViewStyle;
  text: TextStyle;
}

const sizeStyles: Record<ButtonSize, SizeStyle> = {
  sm: {
    container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    text: { fontSize: 14 },
  },
  md: {
    container: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    text: { fontSize: 16 },
  },
  lg: {
    container: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
    text: { fontSize: 18 },
  },
  icon: {
    container: { padding: 10, borderRadius: 12 },
    text: { fontSize: 16 },
  },
};

/** Trigger haptic feedback - can be used standalone outside of Button */
export function triggerHaptic(style: HapticStyle) {
  switch (style) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'selection':
      Haptics.selectionAsync();
      break;
    case 'none':
    default:
      break;
  }
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  style,
  haptic,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  // Use explicit haptic prop or fall back to variant default
  const hapticStyle = haptic ?? variantHaptics[variant];

  const handlePress = (event: any) => {
    if (hapticStyle !== 'none') {
      triggerHaptic(hapticStyle);
    }
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      disabled={isDisabled}
      onPress={handlePress}
      style={[
        styles.base,
        sizeStyle.container,
        variantStyle.container,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={variantStyle.loader} />
      ) : (
        <>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          {children && (
            <Text style={[styles.text, sizeStyle.text, variantStyle.text]}>
              {children}
            </Text>
          )}
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.outfit.semiBold,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});

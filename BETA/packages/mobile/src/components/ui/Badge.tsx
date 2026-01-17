import React from 'react';
import { View, Text, ViewProps } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  default: {
    container: 'bg-gray-100',
    text: 'text-gray-700',
  },
  success: {
    container: 'bg-green-100',
    text: 'text-green-700',
  },
  warning: {
    container: 'bg-yellow-100',
    text: 'text-yellow-700',
  },
  error: {
    container: 'bg-red-100',
    text: 'text-red-700',
  },
  info: {
    container: 'bg-blue-100',
    text: 'text-blue-700',
  },
};

export function Badge({ variant = 'default', children, className, ...props }: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <View
      className={`rounded-full px-2.5 py-0.5 ${styles.container} ${className || ''}`}
      {...props}
    >
      <Text className={`text-xs font-medium ${styles.text}`}>{children}</Text>
    </View>
  );
}

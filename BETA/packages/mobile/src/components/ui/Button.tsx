import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-blue-600 active:bg-blue-700',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-gray-100 active:bg-gray-200',
    text: 'text-gray-900',
  },
  outline: {
    container: 'bg-transparent border border-gray-300 active:bg-gray-50',
    text: 'text-gray-700',
  },
  ghost: {
    container: 'bg-transparent active:bg-gray-100',
    text: 'text-gray-700',
  },
  danger: {
    container: 'bg-red-600 active:bg-red-700',
    text: 'text-white',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: {
    container: 'px-3 py-1.5 rounded-md',
    text: 'text-sm',
  },
  md: {
    container: 'px-4 py-2 rounded-lg',
    text: 'text-base',
  },
  lg: {
    container: 'px-6 py-3 rounded-xl',
    text: 'text-lg',
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <TouchableOpacity
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${sizeStyle.container} ${variantStyle.container} ${
        isDisabled ? 'opacity-50' : ''
      } ${className || ''}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : '#374151'}
        />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={`font-semibold ${sizeStyle.text} ${variantStyle.text}`}>
            {children}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}

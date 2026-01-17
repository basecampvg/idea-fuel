import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className || ''}`}
      {...props}
    >
      {children}
    </View>
  );
}

interface CardHeaderProps extends ViewProps {
  children: React.ReactNode;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <View className={`border-b border-gray-100 px-4 py-3 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <Text className={`text-lg font-semibold text-gray-900 ${className || ''}`}>
      {children}
    </Text>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <Text className={`mt-0.5 text-sm text-gray-500 ${className || ''}`}>{children}</Text>
  );
}

interface CardContentProps extends ViewProps {
  children: React.ReactNode;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <View className={`p-4 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

interface CardFooterProps extends ViewProps {
  children: React.ReactNode;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <View
      className={`border-t border-gray-100 px-4 py-3 ${className || ''}`}
      {...props}
    >
      {children}
    </View>
  );
}

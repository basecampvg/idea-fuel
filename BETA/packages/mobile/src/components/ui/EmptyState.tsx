import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = 'folder-open-outline',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-12">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <Ionicons name={icon} size={32} color="#9ca3af" />
      </View>
      <Text className="text-center text-lg font-medium text-gray-900">{title}</Text>
      {description && (
        <Text className="mt-1 text-center text-gray-500">{description}</Text>
      )}
      {action && <View className="mt-4">{action}</View>}
    </View>
  );
}

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export function Spinner({ size = 'large', color = '#2563eb' }: SpinnerProps) {
  return <ActivityIndicator size={size} color={color} />;
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Spinner size="large" />
      <Text className="mt-4 text-gray-500">{message}</Text>
    </View>
  );
}

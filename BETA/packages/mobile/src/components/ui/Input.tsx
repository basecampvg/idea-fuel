import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text>
      )}
      <TextInput
        className={`rounded-lg border px-4 py-3 text-base text-gray-900 ${
          error
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 bg-white focus:border-blue-500'
        } ${props.editable === false ? 'bg-gray-100 text-gray-500' : ''} ${className || ''}`}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && <Text className="mt-1 text-sm text-red-600">{error}</Text>}
      {hint && !error && <Text className="mt-1 text-sm text-gray-500">{hint}</Text>}
    </View>
  );
}

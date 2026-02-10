import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet, ViewStyle } from 'react-native';

// Forge Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  border: '#1F1E1C',
  borderFocus: 'rgba(233, 30, 140, 0.3)',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  primary: '#E91E8C',
  destructive: '#EF4444',
  destructiveBg: 'rgba(239, 68, 68, 0.1)',
};

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, hint, containerStyle, editable, style, ...props }: InputProps) {
  const isDisabled = editable === false;

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          isDisabled && styles.inputDisabled,
          style,
        ]}
        placeholderTextColor={colors.muted}
        editable={editable}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
}

// Large input for idea capture (matching web dashboard style)
interface IdeaInputProps extends TextInputProps {
  isFocused?: boolean;
  containerStyle?: ViewStyle;
}

export function IdeaInput({ isFocused, containerStyle, style, ...props }: IdeaInputProps) {
  return (
    <View
      style={[
        styles.ideaInputContainer,
        isFocused && styles.ideaInputFocused,
        containerStyle,
      ]}
    >
      <TextInput
        style={[styles.ideaInput, style]}
        placeholderTextColor="rgba(138, 134, 128, 0.6)"
        multiline
        textAlignVertical="top"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
  },
  inputError: {
    borderColor: colors.destructive,
    backgroundColor: colors.destructiveBg,
  },
  inputDisabled: {
    backgroundColor: colors.mutedBg,
    color: colors.muted,
  },
  errorText: {
    marginTop: 6,
    fontSize: 14,
    color: colors.destructive,
  },
  hintText: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted,
  },
  ideaInputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(31, 30, 28, 0.6)',
    backgroundColor: 'rgba(26, 25, 24, 0.8)',
  },
  ideaInputFocused: {
    borderColor: colors.borderFocus,
  },
  ideaInput: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 24,
  },
});

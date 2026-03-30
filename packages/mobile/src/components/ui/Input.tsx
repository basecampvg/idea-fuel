import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet, ViewStyle, Animated, Platform } from 'react-native';
import type { NativeSyntheticEvent, TargetedEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../lib/theme';

const localColors = {
  mutedBg: '#1A1A1A',
};

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, hint, containerStyle, editable, style, onFocus, onBlur, ...props }: InputProps) {
  const isDisabled = editable === false;
  const [isFocused, setIsFocused] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  const animateGlow = useCallback((toValue: number) => {
    Animated.timing(glowAnim, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [glowAnim]);

  const handleFocus = useCallback((e: NativeSyntheticEvent<TargetedEvent>) => {
    setIsFocused(true);
    animateGlow(1);
    onFocus?.(e);
  }, [animateGlow, onFocus]);

  const handleBlur = useCallback((e: NativeSyntheticEvent<TargetedEvent>) => {
    setIsFocused(false);
    animateGlow(0);
    onBlur?.(e);
  }, [animateGlow, onBlur]);

  const animatedShadow = Platform.OS === 'ios' ? {
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.6],
    }),
    shadowRadius: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 12],
    }),
  } : {
    elevation: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 8],
    }),
  };

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <Animated.View style={[styles.inputShadowWrapper, !isDisabled && animatedShadow]}>
        <View style={styles.inputClipWrapper}>
          {!isDisabled && (
            <LinearGradient
              colors={['transparent', colors.brand, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.inputTopGlow}
            />
          )}
          <TextInput
            style={[
              styles.input,
              error && styles.inputError,
              isDisabled && styles.inputDisabled,
              isFocused && styles.inputFocused,
              style,
            ]}
            placeholderTextColor={colors.muted}
            editable={editable}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        </View>
      </Animated.View>
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
      <LinearGradient
        colors={['transparent', colors.brand, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.ideaInputTopGlow}
      />
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
  inputShadowWrapper: {
    borderRadius: 9999,
  },
  inputClipWrapper: {
    borderRadius: 9999,
    overflow: 'hidden',
  },
  inputTopGlow: {
    position: 'absolute',
    top: -1,
    left: 24,
    right: 24,
    height: 2,
    zIndex: 1,
  },
  input: {
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
  },
  inputFocused: {
    borderColor: colors.brandGlow,
  },
  inputError: {
    borderColor: colors.destructive,
    backgroundColor: colors.destructiveMuted,
  },
  inputDisabled: {
    backgroundColor: localColors.mutedBg,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 34, 34, 0.6)',
    backgroundColor: 'rgba(17, 17, 17, 0.8)',
    overflow: 'hidden',
  },
  ideaInputTopGlow: {
    position: 'absolute',
    top: -1,
    left: 24,
    right: 24,
    height: 2,
    zIndex: 1,
  },
  ideaInputFocused: {
    borderColor: colors.brandGlow,
  },
  ideaInput: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 24,
  },
});

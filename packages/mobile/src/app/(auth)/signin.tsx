import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui';
import { IdeaFuelLogo } from '../../components/IdeaFuelLogo';
import { StarField } from '../../components/StarField';
import { TypewriterText } from '../../components/TypewriterText';
import { colors, fonts } from '../../lib/theme';

export default function SignInScreen() {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  // Staggered entrance animations
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const typewriterOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);

  useEffect(() => {
    // Logo fades in first
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }));
    logoScale.value = withDelay(300, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.2)) }));

    // Tagline slides up
    taglineOpacity.value = withDelay(800, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));
    taglineTranslateY.value = withDelay(800, withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }));

    // Typewriter appears
    typewriterOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));

    // Buttons slide up last
    buttonsOpacity.value = withDelay(1600, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));
    buttonsTranslateY.value = withDelay(1600, withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const typewriterStyle = useAnimatedStyle(() => ({
    opacity: typewriterOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      Alert.alert(
        'Sign In Failed',
        'Unable to sign in with Google. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsAppleLoading(true);
      await signInWithApple();
    } catch (error) {
      const err = error as { code?: string; message?: string };
      // User cancelled — no alert needed
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(
        'Sign In Failed',
        err?.message || 'Unable to sign in with Apple. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StarField />
      <SafeAreaView style={styles.safeArea}>
        {/* Center content */}
        <View style={styles.centerContent}>
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            <IdeaFuelLogo size={80} />
          </Animated.View>

          <Animated.View style={taglineStyle}>
            <Text style={styles.tagline}>
              Don't let your ideas die.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.typewriterContainer, typewriterStyle]}>
            <TypewriterText />
          </Animated.View>
        </View>

        {/* Bottom buttons */}
        <Animated.View style={[styles.bottomSection, buttonsStyle]}>
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              }
              cornerRadius={999}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          <Button
            onPress={handleGoogleSignIn}
            isLoading={isLoading}
            disabled={isAppleLoading}
            size="lg"
            leftIcon={<Ionicons name="logo-google" size={20} color="#fff" />}
          >
            Continue with Google
          </Button>

          <Text style={styles.terms}>
            By continuing, you agree to our{'\n'}Terms of Service and Privacy Policy
          </Text>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 32,
  },
  tagline: {
    ...fonts.outfit.semiBold,
    fontSize: 22,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  typewriterContainer: {
    paddingHorizontal: 16,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  appleButton: {
    width: '100%',
    height: 52,
    marginBottom: 12,
  },
  terms: {
    fontSize: 12,
    color: `${colors.muted}99`,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});

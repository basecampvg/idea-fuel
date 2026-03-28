import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
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
  const { signInWithGoogle, devSignIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [devEmail, setDevEmail] = useState('');

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
          <Button
            onPress={handleGoogleSignIn}
            isLoading={isLoading}
            size="lg"
            leftIcon={<Ionicons name="logo-google" size={20} color="#fff" />}
          >
            Continue with Google
          </Button>

          <Text style={styles.terms}>
            By continuing, you agree to our{'\n'}Terms of Service and Privacy Policy
          </Text>

          {/* Dev-only sign in */}
          {__DEV__ && (
            <View style={styles.devSection}>
              <View style={styles.devDivider}>
                <View style={styles.devDividerLine} />
                <Text style={styles.devDividerText}>DEV</Text>
                <View style={styles.devDividerLine} />
              </View>
              <TextInput
                style={styles.devInput}
                value={devEmail}
                onChangeText={setDevEmail}
                placeholder="your@email.com"
                placeholderTextColor={`${colors.muted}80`}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.devButton}
                onPress={async () => {
                  if (!devEmail.trim()) return;
                  try {
                    setIsLoading(true);
                    await devSignIn?.(devEmail.trim());
                  } catch (error: any) {
                    Alert.alert('Dev Sign In Failed', error.message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                <Text style={styles.devButtonText}>Dev Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
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
    fontFamily: fonts.mono.medium,
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
  terms: {
    fontSize: 12,
    color: `${colors.muted}99`,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  devSection: {
    marginTop: 24,
    gap: 12,
  },
  devDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  devDividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1,
  },
  devInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
  },
  devButton: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

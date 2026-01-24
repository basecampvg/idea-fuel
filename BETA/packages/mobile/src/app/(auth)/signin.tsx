import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui';

// Forge Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  border: '#1F1E1C',
  primary: '#E91E8C',
  accent: '#14B8A6',
  secondary: '#8B5CF6',
  foreground: '#E8E4DC',
  muted: '#8A8680',
};

export default function SignInScreen() {
  const { signInWithGoogle, devLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDevLoading, setIsDevLoading] = useState(false);

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

  const handleDevLogin = async () => {
    try {
      setIsDevLoading(true);
      await devLogin();
    } catch (error) {
      Alert.alert(
        'Dev Login Failed',
        'Unable to login as dev user. Is the server running?',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDevLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Ionicons name="flame" size={48} color="#fff" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Welcome to ideationLab</Text>
          <Text style={styles.subtitle}>
            Transform your ideas into comprehensive business intelligence
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureRow
            icon="sparkles-outline"
            title="AI Interviews"
            description="Guided discovery conversations"
            color={colors.primary}
          />
          <FeatureRow
            icon="analytics-outline"
            title="Market Research"
            description="Deep competitive analysis"
            color={colors.accent}
          />
          <FeatureRow
            icon="document-text-outline"
            title="Business Reports"
            description="Professional docs, instantly"
            color={colors.secondary}
          />
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Sign In Buttons */}
        <View style={styles.buttons}>
          <Button
            onPress={handleGoogleSignIn}
            isLoading={isLoading}
            size="lg"
            leftIcon={<Ionicons name="logo-google" size={20} color="#fff" />}
          >
            Continue with Google
          </Button>

          {/* Dev Login - only shown in development */}
          {__DEV__ && (
            <View style={styles.devButtonWrapper}>
              <Button
                onPress={handleDevLogin}
                isLoading={isDevLoading}
                size="lg"
                variant="outline"
                leftIcon={<Ionicons name="code-slash" size={20} color={colors.muted} />}
              >
                Dev Login (Skip OAuth)
              </Button>
            </View>
          )}

          <Text style={styles.terms}>
            By continuing, you agree to our{'\n'}Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Feature row component
function FeatureRow({ icon, title, description, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    maxWidth: 280,
  },
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  buttons: {
    marginTop: 'auto',
  },
  devButtonWrapper: {
    marginTop: 12,
  },
  terms: {
    fontSize: 12,
    color: `${colors.muted}99`,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});

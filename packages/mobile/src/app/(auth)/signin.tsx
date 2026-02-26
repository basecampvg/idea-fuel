import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Mic, BarChart3, FileText } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui';
import { IdeaFuelLogo } from '../../components/IdeaFuelLogo';
import { colors } from '../../lib/theme';

export default function SignInScreen() {
  const { signInWithGoogle, devSignIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [devEmail, setDevEmail] = useState('');

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
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Flame Logo */}
          <View style={styles.logoContainer}>
            <IdeaFuelLogo size={72} />
          </View>

          {/* IDEA FUEL wordmark */}
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkIdea}>IDEA </Text>
            <Text style={styles.wordmarkFuel}>FUEL</Text>
          </View>

          {/* Tagline */}
          <Text style={styles.subtitle}>
            Don't let your ideas die
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureRow
            icon={<Mic size={24} color={colors.brand} />}
            title="Voice Capture"
            description="Speak your ideas on the go"
            color={colors.brand}
          />
          <FeatureRow
            icon={<BarChart3 size={24} color={colors.accent} />}
            title="Market Research"
            description="Deep competitive analysis"
            color={colors.accent}
          />
          <FeatureRow
            icon={<FileText size={24} color={colors.brandEnd} />}
            title="Business Reports"
            description="Professional docs, instantly"
            color={colors.brandEnd}
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
                    await devSignIn(devEmail.trim());
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: `${color}20` }]}>
        {icon}
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  wordmarkIdea: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#BCBCBC',
  },
  wordmarkFuel: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    color: colors.brand,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
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

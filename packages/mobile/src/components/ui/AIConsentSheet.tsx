import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { X, Brain, MessageSquare, Image, Shield } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

interface AIConsentSheetProps {
  onAllow: () => void;
  onDecline: () => void;
}

const DATA_ITEMS = [
  {
    Icon: Brain,
    title: 'AI-Powered Analysis',
    description:
      'Your ideas are analyzed by Anthropic (Claude), OpenAI, and Perplexity to generate validation insights',
  },
  {
    Icon: MessageSquare,
    title: 'What We Send',
    description:
      'Your idea descriptions, chat messages during validation, and images you attach',
  },
  {
    Icon: Shield,
    title: 'Your Data, Your Choice',
    description:
      'Data is sent only for analysis — not used to train AI models. You can decline and still use IdeaFuel for capturing ideas',
  },
] as const;

export function AIConsentSheet({ onAllow, onDecline }: AIConsentSheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    Keyboard.dismiss();
    translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    backdropOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  const dismiss = (callback: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: 250, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(callback)();
      },
    );
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.6,
  }));

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss(onDecline)}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      <Animated.View style={[styles.sheetContainer, sheetStyle]}>
        <BlurView intensity={40} tint="dark" style={styles.blurFill}>
          <View style={styles.darkOverlay}>
            <LinearGradient
              colors={['transparent', colors.brand, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.topGlow}
            />

            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => dismiss(onDecline)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <X size={20} color={colors.muted} />
            </TouchableOpacity>

            <View style={styles.content}>
              <Text style={styles.title}>AI Data Disclosure</Text>
              <Text style={styles.subtitle}>
                IdeaFuel uses third-party AI services to validate your ideas and
                provide market analysis
              </Text>

              <View style={styles.featureList}>
                {DATA_ITEMS.map(({ Icon, title, description }) => (
                  <View key={title} style={styles.featureCard}>
                    <View style={styles.featureIcon}>
                      <Icon size={24} color={colors.brand} />
                    </View>
                    <View style={styles.featureText}>
                      <Text style={styles.featureTitle}>{title}</Text>
                      <Text style={styles.featureDescription}>{description}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => dismiss(onAllow)}
                accessibilityLabel="Allow AI data sharing"
                accessibilityRole="button"
              >
                <Text style={styles.ctaText}>Allow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => dismiss(onDecline)}
                accessibilityLabel="Decline AI data sharing"
                accessibilityRole="button"
              >
                <Text style={styles.declineText}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheetContainer: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  blurFill: {
    flex: 1,
  },
  darkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.7)',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: 2,
    opacity: 0.5,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    padding: 4,
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    ...fonts.outfit.bold,
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    ...fonts.geist.regular,
    color: colors.muted,
    marginBottom: 32,
    lineHeight: 22,
  },
  featureList: {
    gap: 12,
    flex: 1,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 22, 22, 0.8)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    ...fonts.geist.regular,
    color: colors.muted,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: colors.brand,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  ctaText: {
    fontSize: 18,
    ...fonts.outfit.semiBold,
    color: '#FFFFFF',
  },
  declineButton: {
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  declineText: {
    fontSize: 16,
    ...fonts.geist.regular,
    color: colors.muted,
  },
});

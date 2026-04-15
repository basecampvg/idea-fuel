import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { X, Mic, NotebookPen, Vault, TrendingUp, FlaskConical, Pencil } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 100;

interface WelcomeSheetProps {
  onDismiss: () => void;
}

const FEATURES = [
  {
    Icon: Mic,
    title: 'Capture Ideas',
    description: 'Speak or type — your ideas are instantly captured and organized',
  },
  {
    Icon: NotebookPen,
    title: 'Notes',
    description: 'Add context, research, and details to flesh out any idea',
  },
  {
    Icon: FlaskConical,
    title: 'Sandbox',
    description: 'A space to experiment, iterate, and develop your ideas freely',
  },
  {
    Icon: Pencil,
    title: 'Sketch',
    description: 'Generate AI visuals to bring your ideas to life',
  },
  {
    Icon: Vault,
    title: 'Vault',
    description: 'Your best ideas live here — organized, searchable, always ready',
  },
  {
    Icon: TrendingUp,
    title: 'Validate',
    description: 'AI-powered analysis tells you if your idea has real potential',
  },
] as const;

export function WelcomeSheet({ onDismiss }: WelcomeSheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [modalVisible, setModalVisible] = React.useState(true);
  const startY = useSharedValue(0);

  const dismiss = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(setModalVisible)(false);
        runOnJS(onDismiss)();
      }
    });
  }, [onDismiss]);

  useEffect(() => {
    requestAnimationFrame(() => {
      translateY.value = withTiming(0, { duration: 300 });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    });
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const newY = startY.value + event.translationY;
      translateY.value = Math.max(0, newY);
      const progress = Math.max(0, 1 - newY / (SCREEN_HEIGHT * 0.4));
      backdropOpacity.value = progress;
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > 500) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withTiming(0, { duration: 250 });
        backdropOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.3,
  }));

  if (!modalVisible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

      <View style={styles.container}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={dismiss}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableOpacity>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, sheetStyle]}>
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
                  onPress={dismiss}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>

                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.content}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.title}>Welcome to IdeaFuel</Text>
                  <Text style={styles.subtitle}>
                    Everything you need to capture and validate ideas
                  </Text>

                  <View style={styles.featureList}>
                    {FEATURES.map(({ Icon, title, description }) => (
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

                  <TouchableOpacity style={styles.ctaButton} onPress={dismiss}>
                    <Text style={styles.ctaText}>Get Started</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </BlurView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  blurFill: {},
  darkOverlay: {
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
    paddingVertical: 12,
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
  scrollView: {
    flexGrow: 0,
  },
  content: {
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
  },
  featureList: {
    gap: 12,
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
});

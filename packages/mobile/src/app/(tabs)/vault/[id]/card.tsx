import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
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
  Easing,
} from 'react-native-reanimated';
import { ChevronLeft, Sparkles, Monitor, Search, FileText, BarChart3, Rocket, X, Users } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, triggerHaptic } from '../../../../components/ui/Button';
import { ValidationCard } from '../../../../components/ui/ValidationCard';
import { LoadingScreen } from '../../../../components/ui/Spinner';
import { trpc } from '../../../../lib/trpc';
import { colors, fonts } from '../../../../lib/theme';
import { useAIConsentGate } from '../../../../hooks/useAIConsentGate';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const WEB_FEATURES = [
  { Icon: Search, text: 'Deep market research with real-time data' },
  { Icon: FileText, text: 'Full business plan generation' },
  { Icon: BarChart3, text: 'Financial models and revenue projections' },
  { Icon: Monitor, text: 'Competitor deep-dives and SWOT analysis' },
] as const;

function WebAppSheet({ onDismiss }: { onDismiss: () => void }) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    backdropOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  const dismiss = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: 250, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(onDismiss)();
      },
    );
  }, [onDismiss]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.6,
  }));

  return (
    <View style={styles.glassOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
        <Animated.View style={[styles.glassBackdrop, backdropStyle]} />
      </Pressable>

      <Animated.View style={[styles.glassSheetContainer, sheetStyle]}>
        <BlurView intensity={40} tint="dark" style={styles.glassBlurFill}>
          <View style={styles.glassDarkOverlay}>
            <LinearGradient
              colors={['transparent', colors.brand, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.glassTopGlow}
            />

            <View style={styles.glassHandleContainer}>
              <View style={styles.glassHandle} />
            </View>

            <TouchableOpacity
              style={styles.glassCloseButton}
              onPress={dismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.muted} />
            </TouchableOpacity>

            <View style={styles.glassContent}>
              <Text style={styles.glassTitle}>Full Research on Web</Text>
              <Text style={styles.webSheetDescription}>
                Take your validation further with our full web experience. Log in at{' '}
                <Text style={styles.webSheetUrl}>app.ideafuel.ai</Text> on your
                computer to unlock:
              </Text>

              <View style={styles.webFeatureList}>
                {WEB_FEATURES.map(({ Icon, text }) => (
                  <View key={text} style={styles.webFeatureRow}>
                    <View style={styles.webFeatureIcon}>
                      <Icon size={20} color={colors.brand} />
                    </View>
                    <Text style={styles.webFeatureText}>{text}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.webSheetHint}>
                Your validated ideas are already synced and ready to promote when you log in.
              </Text>

              <TouchableOpacity style={styles.glassDismissButton} onPress={dismiss}>
                <Text style={styles.glassDismissText}>Got It</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // AI consent gate
  const { checkConsent, ConsentGate } = useAIConsentGate();

  // Web app sheet state
  const [showWebSheet, setShowWebSheet] = useState(false);

  // Fetch project data to get cardResult
  const { data: project, isLoading } = trpc.project.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  const handleUnlock = () => {
    triggerHaptic('medium');
    setShowWebSheet(true);
  };

  const handleRefine = () => {
    router.replace(`/(tabs)/vault/${id}/validate?refine=1` as any);
  };

  const handleCustomerInterview = () => {
    triggerHaptic('medium');
    router.push(`/(tabs)/vault/${id}/customer-interview` as any);
  };

  if (isLoading) {
    return <LoadingScreen message="Loading your card..." />;
  }

  if (!project?.cardResult) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Validation Card</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No validation card found</Text>
          <Button variant="outline" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  // Cast cardResult from JSONB (it comes back as unknown from Drizzle)
  const cardResult = project.cardResult as any;

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validation Card</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Project title */}
        <Text style={styles.projectTitle}>{project.title}</Text>

        {/* Validation Card */}
        <ValidationCard cardResult={cardResult} />

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <Button
            variant="primary"
            size="lg"
            onPress={handleUnlock}
            leftIcon={<Rocket size={18} color={colors.white} />}
            style={styles.fullWidth}
          >
            Go Deeper
          </Button>

          <Button
            variant="outline"
            size="lg"
            onPress={handleCustomerInterview}
            leftIcon={<Users size={18} color={colors.accent} />}
            style={styles.fullWidth}
          >
            Talk to Customers
          </Button>

          <Button
            variant="ghost"
            size="md"
            onPress={handleRefine}
            leftIcon={<Sparkles size={16} color={colors.muted} />}
          >
            Refine idea with AI
          </Button>
        </View>
      </ScrollView>

      {/* Web App Info Sheet (glass style) */}
      {showWebSheet && (
        <WebAppSheet onDismiss={() => setShowWebSheet(false)} />
      )}

      {ConsentGate}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 20,
  },
  projectTitle: {
    fontSize: 22,
    ...fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  actionButtons: {
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  fullWidth: {
    width: '100%',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  glassBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  glassSheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  glassBlurFill: {},
  glassDarkOverlay: {
    backgroundColor: 'rgba(10, 10, 10, 0.7)',
  },
  glassTopGlow: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
  },
  glassHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  glassHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: 2,
    opacity: 0.5,
  },
  glassCloseButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    padding: 4,
    zIndex: 1,
  },
  glassContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  glassTitle: {
    fontSize: 24,
    ...fonts.outfit.bold,
    color: colors.foreground,
  },
  glassDismissButton: {
    backgroundColor: colors.brand,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  glassDismissText: {
    fontSize: 18,
    ...fonts.outfit.semiBold,
    color: '#FFFFFF',
  },
  webSheetDescription: {
    fontSize: 15,
    ...fonts.geist.regular,
    color: colors.muted,
    lineHeight: 22,
  },
  webSheetUrl: {
    color: colors.brand,
    ...fonts.outfit.semiBold,
  },
  webFeatureList: {
    gap: 12,
  },
  webFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  webFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFeatureText: {
    fontSize: 15,
    ...fonts.geist.regular,
    color: colors.foreground,
    lineHeight: 22,
    flex: 1,
  },
  webSheetHint: {
    fontSize: 14,
    ...fonts.geist.regular,
    color: colors.mutedDim,
    lineHeight: 20,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
});

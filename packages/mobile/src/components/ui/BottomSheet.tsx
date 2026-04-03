import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';

import { colors } from '../../lib/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 100;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  headerRight?: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  headerRight,
}: BottomSheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [modalVisible, setModalVisible] = React.useState(false);
  const startY = useSharedValue(0);

  const dismiss = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(setModalVisible)(false);
        runOnJS(onClose)();
      }
    });
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
      setModalVisible(true);
      requestAnimationFrame(() => {
        translateY.value = withTiming(0, { duration: 300 });
        backdropOpacity.value = withTiming(1, { duration: 300 });
      });
    } else if (modalVisible) {
      dismiss();
    }
  }, [visible]);

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

                {(title || showCloseButton || headerRight) && (
                  <View style={styles.header}>
                    {title && <Text style={styles.title}>{title}</Text>}
                    <View style={styles.headerActions}>
                      {headerRight}
                      {showCloseButton && (
                        <TouchableOpacity
                          onPress={dismiss}
                          style={styles.closeButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <X size={20} color={colors.muted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.content}>{children}</View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});

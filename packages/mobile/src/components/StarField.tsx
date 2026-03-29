import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../lib/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

function AnimatedStar({ star }: { star: Star }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      star.delay,
      withRepeat(
        withTiming(1, { duration: star.duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [star.opacity * 0.2, star.opacity]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: '#FFFFFF',
        },
        animatedStyle,
      ]}
    />
  );
}

function NebulaGlow() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.06, 0.12, 0.06]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.15]) }],
  }));

  return (
    <Animated.View style={[styles.nebula, animatedStyle]}>
      <View style={styles.nebulaCore} />
    </Animated.View>
  );
}

export function StarField() {
  const stars = useMemo(() => {
    const result: Star[] = [];
    for (let i = 0; i < 120; i++) {
      result.push({
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        delay: Math.random() * 4000,
        duration: Math.random() * 3000 + 2000,
      });
    }
    return result;
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      <NebulaGlow />
      {stars.map((star, i) => (
        <AnimatedStar key={i} star={star} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  nebula: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.4,
    height: SCREEN_HEIGHT * 0.6,
    left: -SCREEN_WIDTH * 0.2,
    top: SCREEN_HEIGHT * 0.15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nebulaCore: {
    width: '80%',
    height: '60%',
    borderRadius: 300,
    backgroundColor: colors.brand,
    opacity: 0.08,
  },
});

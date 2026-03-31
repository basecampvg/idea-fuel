import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, FlatList, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { triggerHaptic } from './Button';
import { colors } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const CARD_GAP = 16;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

interface PlanPagerProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  tierColors: string[];
  initialIndex?: number;
  onActiveIndexChange?: (index: number) => void;
}

export function PlanPager<T>({
  data,
  renderItem,
  tierColors,
  initialIndex = 0,
  onActiveIndexChange,
}: PlanPagerProps<T>) {
  const scrollX = useSharedValue(initialIndex * SNAP_INTERVAL);
  const activeIndex = useRef(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = useCallback(
    (event: any) => {
      scrollX.value = event.nativeEvent.contentOffset.x;
    },
    [],
  );

  // Pre-scroll to initial index on mount
  useEffect(() => {
    if (initialIndex > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: initialIndex * SNAP_INTERVAL,
          animated: false,
        });
      }, 100);
    }
  }, [initialIndex]);

  const handleMomentumEnd = useCallback(
    (event: any) => {
      const newIndex = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);
      if (newIndex !== activeIndex.current && newIndex >= 0 && newIndex < data.length) {
        activeIndex.current = newIndex;
        triggerHaptic('selection');
        onActiveIndexChange?.(newIndex);
      }
    },
    [data.length, onActiveIndexChange],
  );

  const keyExtractor = useCallback((_: T, index: number) => String(index), []);

  const renderFlatListItem = useCallback(
    ({ item, index }: { item: T; index: number }) => (
      <View style={{ width: CARD_WIDTH }}>
        {renderItem(item, index)}
      </View>
    ),
    [renderItem],
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderFlatListItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: HORIZONTAL_PADDING,
          gap: CARD_GAP,
        }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + CARD_GAP,
          offset: (CARD_WIDTH + CARD_GAP) * index,
          index,
        })}
      />

      {/* Dot indicators */}
      <View style={styles.dotsContainer}>
        {data.map((_, index) => (
          <DotIndicator
            key={index}
            index={index}
            scrollX={scrollX}
            color={tierColors[index] || colors.brand}
            total={data.length}
          />
        ))}
      </View>
    </View>
  );
}

interface DotIndicatorProps {
  index: number;
  scrollX: SharedValue<number>;
  color: string;
  total: number;
}

function DotIndicator({ index, scrollX, color, total }: DotIndicatorProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];

    const width = interpolate(scrollX.value, inputRange, [8, 24, 8], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], 'clamp');

    return {
      width,
      opacity,
      backgroundColor: color,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 20,
    paddingBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

export { CARD_WIDTH };

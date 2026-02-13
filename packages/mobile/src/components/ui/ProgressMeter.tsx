import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ideationLab Design System Colors
const colors = {
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  border: '#1F1E1C',
  success: '#22C55E',
  warning: '#F59E0B',
  destructive: '#EF4444',
};

interface ProgressMeterProps {
  value: number; // 0-100
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  colorThresholds?: {
    low: number;  // Below this = red
    mid: number;  // Below this = orange, above = green
  };
  customColor?: string;
}

export function ProgressMeter({
  value,
  label,
  showValue = true,
  size = 'md',
  colorThresholds = { low: 50, mid: 75 },
  customColor,
}: ProgressMeterProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const getColor = () => {
    if (customColor) return customColor;
    if (clampedValue < colorThresholds.low) return colors.destructive;
    if (clampedValue < colorThresholds.mid) return colors.warning;
    return colors.success;
  };

  const getLabel = () => {
    if (clampedValue >= colorThresholds.mid) return 'High';
    if (clampedValue >= colorThresholds.low) return 'Moderate';
    return 'Low';
  };

  const barColor = getColor();
  const barHeight = size === 'sm' ? 4 : size === 'md' ? 6 : 8;

  return (
    <View style={styles.container}>
      {(label || showValue) && (
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showValue && (
            <View style={styles.valueContainer}>
              <Text style={[styles.value, { color: barColor }]}>{clampedValue}</Text>
              <Text style={[styles.labelSuffix, { color: barColor }]}>{getLabel()}</Text>
            </View>
          )}
        </View>
      )}
      <View style={[styles.track, { height: barHeight }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedValue}%`,
              backgroundColor: barColor,
              height: barHeight,
            },
          ]}
        />
      </View>
    </View>
  );
}

interface ConfidenceDotsProps {
  level: 'high' | 'medium' | 'low';
  showLabel?: boolean;
}

export function ConfidenceDots({ level, showLabel = true }: ConfidenceDotsProps) {
  const getColor = () => {
    switch (level) {
      case 'high':
        return colors.success;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.destructive;
      default:
        return colors.muted;
    }
  };

  const dotColor = getColor();
  const filledDots = level === 'high' ? 3 : level === 'medium' ? 2 : 1;

  return (
    <View style={styles.dotsContainer}>
      {[1, 2, 3].map((dot) => (
        <View
          key={dot}
          style={[
            styles.dot,
            {
              backgroundColor: dot <= filledDots ? dotColor : colors.mutedBg,
            },
          ]}
        />
      ))}
      {showLabel && (
        <Text style={[styles.dotLabel, { color: dotColor }]}>
          {level.charAt(0).toUpperCase() + level.slice(1)} confidence
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
  labelSuffix: {
    fontSize: 12,
    fontWeight: '500',
  },
  track: {
    backgroundColor: colors.mutedBg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotLabel: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default ProgressMeter;

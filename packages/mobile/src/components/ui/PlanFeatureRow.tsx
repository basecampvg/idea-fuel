import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Zap,
  Sparkles,
  Mic,
  FileText,
  Users,
  Search,
  BarChart3,
  Rocket,
  Shield,
  Monitor,
  TrendingUp,
  Award,
  ChevronUp,
  Check,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  Sparkles,
  Mic,
  FileText,
  Users,
  Search,
  BarChart3,
  Rocket,
  Shield,
  Monitor,
  TrendingUp,
  Award,
  ChevronUp,
  Check,
};

interface PlanFeatureRowProps {
  text: string;
  iconName?: string;
  accentColor: string;
  index: number;
  animate?: boolean;
}

export function PlanFeatureRow({
  text,
  iconName,
  accentColor,
  index,
  animate = true,
}: PlanFeatureRowProps) {
  const IconComponent = iconName ? ICON_MAP[iconName] : Check;
  const isIncludes = iconName === 'ChevronUp';

  const content = (
    <View style={[styles.row, isIncludes && styles.includesRow]}>
      <View style={[styles.iconContainer, { backgroundColor: `${accentColor}15` }]}>
        {IconComponent && (
          <IconComponent size={14} color={accentColor} />
        )}
      </View>
      <Text style={[styles.text, isIncludes && styles.includesText]}>{text}</Text>
    </View>
  );

  if (!animate) return content;

  return (
    <Animated.View entering={FadeIn.delay(200 + index * 60).duration(300)}>
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  includesRow: {
    opacity: 0.7,
    paddingTop: 2,
    paddingBottom: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    ...fonts.geist.medium,
    color: colors.foreground,
    flex: 1,
    lineHeight: 20,
  },
  includesText: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
  },
});

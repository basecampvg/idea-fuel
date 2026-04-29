import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AIRefinementSectionProps {
  refinedTitle: string | null;
  refinedDescription: string | null;
  refinedTags: string[] | null;
  lastRefinedAt: Date | string | null;
  updatedAt: Date | string | null;
  isRefining: boolean;
  onRefine: () => void;
}

function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function AIRefinementSection({
  refinedTitle,
  refinedDescription,
  refinedTags,
  lastRefinedAt,
  updatedAt,
  isRefining,
  onRefine,
}: AIRefinementSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const isRefined = !!(refinedTitle || refinedDescription);

  const isStale = (() => {
    if (!isRefined || !lastRefinedAt || !updatedAt) return false;
    const refined = typeof lastRefinedAt === 'string' ? new Date(lastRefinedAt) : lastRefinedAt;
    const updated = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
    return updated.getTime() > refined.getTime();
  })();

  useEffect(() => {
    if (isRefining) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isRefining, shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  // Not refined — show CTA
  if (!isRefined && !isRefining) {
    return (
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={onRefine}
        activeOpacity={0.7}
      >
        <View style={styles.ctaContent}>
          <Sparkles size={16} color={colors.accent} />
          <Text style={styles.ctaText}>Refine with AI</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Refining — shimmer state
  if (isRefining) {
    return (
      <Animated.View style={[styles.container, { opacity: shimmerOpacity }]}>
        <View style={styles.refiningContent}>
          <Sparkles size={16} color={colors.accent} />
          <Text style={styles.refiningText}>Refining...</Text>
        </View>
      </Animated.View>
    );
  }

  // Refined — collapsible view
  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerTitleRow}>
          <Sparkles size={16} color={colors.accent} />
          <Text style={styles.headerTitle}>AI Refinement</Text>
        </View>
        <Text style={styles.toggleText}>{expanded ? 'Hide' : 'Show'}</Text>
      </TouchableOpacity>

      {!expanded && refinedTitle ? (
        <Text style={styles.previewText} numberOfLines={1}>
          {refinedTitle}
        </Text>
      ) : null}

      {expanded && (
        <View style={styles.expandedContent}>
          {refinedTitle ? (
            <Text style={styles.refinedTitle}>{refinedTitle}</Text>
          ) : null}
          {refinedDescription ? (
            <Text style={styles.refinedDescription}>{refinedDescription}</Text>
          ) : null}
          {refinedTags && refinedTags.length > 0 ? (
            <View style={styles.tagsRow}>
              {refinedTags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {lastRefinedAt ? (
            <Text style={styles.timestamp}>
              Refined {formatRelativeDate(lastRefinedAt)}
            </Text>
          ) : null}
        </View>
      )}

      {isStale && (
        <TouchableOpacity
          style={styles.reRefineButton}
          onPress={onRefine}
          activeOpacity={0.7}
        >
          <Sparkles size={14} color={colors.accent} />
          <Text style={styles.reRefineText}>Re-refine with AI</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ctaButton: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    color: colors.foreground,
    fontSize: 14,
    ...fonts.text.medium,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refiningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refiningText: {
    color: colors.muted,
    fontSize: 14,
    ...fonts.text.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 15,
    ...fonts.display.semiBold,
  },
  toggleText: {
    color: colors.muted,
    fontSize: 13,
    ...fonts.text.medium,
  },
  previewText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 8,
    ...fonts.text.regular,
  },
  expandedContent: {
    marginTop: 12,
  },
  refinedTitle: {
    color: colors.foreground,
    fontSize: 16,
    marginBottom: 8,
    ...fonts.display.bold,
  },
  refinedDescription: {
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    ...fonts.text.regular,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagPill: {
    backgroundColor: colors.brandMuted,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: colors.brand,
    fontSize: 12,
    ...fonts.text.medium,
  },
  timestamp: {
    color: colors.mutedDim,
    fontSize: 12,
    ...fonts.text.regular,
  },
  reRefineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reRefineText: {
    color: colors.accent,
    fontSize: 13,
    ...fonts.text.medium,
  },
});

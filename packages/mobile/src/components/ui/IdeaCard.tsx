import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CheckCircle } from 'lucide-react-native';
import { Button, triggerHaptic } from './Button';
import { Badge } from './Badge';
import { Spinner } from './Spinner';
import { colors, fonts } from '../../lib/theme';

interface IdeaCardProps {
  refinedTitle: string;
  refinedDescription: string;
  refinedTags: string[];

  isPromoted: boolean;
  isRefining: boolean;
  isPromoting: boolean;
  onPromote: () => void;
  onCollapse?: () => void;
}

export function IdeaCard({
  refinedTitle,
  refinedDescription,
  refinedTags,

  isPromoted,
  isRefining,
  isPromoting,
  onPromote,
  onCollapse,
}: IdeaCardProps) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Tappable body area — collapses the card (does not wrap action buttons) */}
      <TouchableOpacity activeOpacity={0.8} onPress={onCollapse} disabled={!onCollapse} style={styles.bodyTouchable}>
        {/* Header row */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {refinedTitle}
          </Text>
          {isPromoted && (
            <Badge variant="success">Promoted</Badge>
          )}
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={4}>
          {refinedDescription}
        </Text>

        {/* Tags */}
        {refinedTags.length > 0 && (
          <View style={styles.tagsRow}>
            {refinedTags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}


      </TouchableOpacity>

      {/* Refining indicator */}
      {isRefining && (
        <View style={styles.refiningRow}>
          <Spinner size="small" color={colors.brand} />
          <Text style={styles.refiningText}>Updating...</Text>
        </View>
      )}

      {/* Action button */}
      <View style={styles.actions}>
        {isPromoted ? (
          <Button
            variant="primary"
            size="sm"
            disabled
            leftIcon={<CheckCircle size={14} color={colors.white} />}
            style={styles.promoteButton}
          >
            Promoted
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              triggerHaptic('success');
              onPromote();
            }}
            disabled={isPromoting || !refinedTitle}
            isLoading={isPromoting}
            style={styles.promoteButton}
          >
            Promote to Idea
          </Button>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  bodyTouchable: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    ...fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    ...fonts.geist.regular,
    color: colors.muted,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: colors.brandMuted,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    ...fonts.geist.medium,
    color: colors.brand,
  },

  refiningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refiningText: {
    fontSize: 12,
    ...fonts.outfit.medium,
    color: colors.brand,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  promoteButton: {
    flex: 1,
  },
});

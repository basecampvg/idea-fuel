import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { RefreshCw, CheckCircle } from 'lucide-react-native';
import { Button, triggerHaptic } from './Button';
import { Badge } from './Badge';
import { Spinner } from './Spinner';
import { colors, fonts } from '../../lib/theme';

interface IdeaCardProps {
  refinedTitle: string;
  refinedDescription: string;
  refinedTags: string[];
  isStale: boolean;
  isPromoted: boolean;
  isRefining: boolean;
  isPromoting: boolean;
  onRefine: () => void;
  onPromote: () => void;
}

export function IdeaCard({
  refinedTitle,
  refinedDescription,
  refinedTags,
  isStale,
  isPromoted,
  isRefining,
  isPromoting,
  onRefine,
  onPromote,
}: IdeaCardProps) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
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

      {/* Stale indicator */}
      {isStale && !isPromoted && (
        <Text style={styles.staleText}>
          Based on earlier content — tap Refine to update
        </Text>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          onPress={onRefine}
          disabled={isRefining || isPromoted}
          leftIcon={
            isRefining ? (
              <Spinner size="small" color={colors.foreground} />
            ) : (
              <RefreshCw size={14} color={colors.foreground} />
            )
          }
          style={styles.refineButton}
        >
          {isRefining ? 'Refining...' : 'Refine'}
        </Button>

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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.geist.regular,
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
    fontFamily: fonts.mono.regular,
    color: colors.brand,
  },
  staleText: {
    fontSize: 12,
    fontFamily: fonts.outfit.regular,
    color: colors.warning,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  refineButton: {
    flex: 1,
  },
  promoteButton: {
    flex: 1,
  },
});

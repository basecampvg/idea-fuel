import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Zap } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

interface CollisionMatch {
  id: string;
  connectionType: string;
  strength: number;
  linkedThought: {
    id: string;
    content: string;
    thoughtType: string;
    createdAt: string;
  };
}

interface CollisionCardProps {
  connection: CollisionMatch;
  onViewTogether: () => void;
  onAddToCluster: () => void;
  onDismiss: () => void;
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 1) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CollisionCard({ connection, onViewTogether, onAddToCluster, onDismiss }: CollisionCardProps) {
  const thought = connection.linkedThought;
  const preview = thought.content.length > 100
    ? thought.content.slice(0, 100) + '...'
    : thought.content;

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)} exiting={FadeOut.duration(200)}>
      <TouchableOpacity style={styles.card} onPress={onDismiss} activeOpacity={1}>
        <View style={styles.header}>
          <Zap size={14} color="#F59E0B" />
          <Text style={styles.headerText}>
            This connects to something from {formatRelativeDate(thought.createdAt)}
          </Text>
        </View>
        <Text style={styles.preview} numberOfLines={3}>
          {preview}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={onViewTogether} activeOpacity={0.7}>
            <Text style={styles.actionText}>View Together</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onAddToCluster} activeOpacity={0.7}>
            <Text style={styles.actionText}>Add to Cluster</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  headerText: {
    color: colors.muted,
    fontSize: 13,
    ...fonts.text.medium,
    flex: 1,
  },
  preview: {
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    ...fonts.text.regular,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    color: colors.foreground,
    fontSize: 13,
    ...fonts.text.medium,
  },
});

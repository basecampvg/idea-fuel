import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../lib/theme';

const CAPTURE_METHODS: Record<string, { icon: string; label: string }> = {
  quick_text: { icon: '✏️', label: 'text' },
  voice: { icon: '🎙', label: 'voice memo' },
  photo: { icon: '📷', label: 'photo' },
  share_extension: { icon: '🔗', label: 'share' },
};

interface SourceLabelProps {
  captureMethod: string;
  createdAt: Date | string;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 7) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  if (diffDays > 0) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }

  if (diffHours > 0) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  if (diffMinutes > 0) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  return 'Just now';
}

export function SourceLabel({ captureMethod, createdAt }: SourceLabelProps) {
  const method = CAPTURE_METHODS[captureMethod] || { icon: '📝', label: captureMethod };
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const formattedDate = formatRelativeDate(date);

  return (
    <Text style={styles.label}>
      {method.icon} Captured via {method.label} {'\u00B7'} {formattedDate}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
    paddingHorizontal: 20,
  },
});

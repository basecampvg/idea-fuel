import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pencil, Mic, Camera, Link } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

const CAPTURE_METHODS: Record<string, { Icon: LucideIcon; label: string }> = {
  quick_text: { Icon: Pencil, label: 'text' },
  voice: { Icon: Mic, label: 'voice memo' },
  photo: { Icon: Camera, label: 'photo' },
  share_extension: { Icon: Link, label: 'share' },
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
  const method = CAPTURE_METHODS[captureMethod] || { Icon: Pencil, label: captureMethod };
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const formattedDate = formatRelativeDate(date);
  const IconComponent = method.Icon;

  return (
    <View style={styles.container}>
      <IconComponent size={14} color={colors.muted} />
      <Text style={styles.label}>
        Captured via {method.label} {'\u00B7'} {formattedDate}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { trpc } from '../lib/trpc';

const colors = {
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedDim: '#5A5855',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentDrafts() {
  const router = useRouter();
  const { data } = trpc.project.list.useQuery({ limit: 3 });

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent</Text>
      {items.map((project) => (
        <TouchableOpacity
          key={project.id}
          style={styles.card}
          onPress={() => router.push(`/(tabs)/vault/${project.id}` as any)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <Text style={styles.title} numberOfLines={1}>
              {project.title}
            </Text>
            <Text style={styles.time}>
              {formatRelativeTime(new Date(project.updatedAt))}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.mutedDim} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground,
    flex: 1,
    marginRight: 12,
  },
  time: {
    fontSize: 13,
    color: colors.mutedDim,
  },
});

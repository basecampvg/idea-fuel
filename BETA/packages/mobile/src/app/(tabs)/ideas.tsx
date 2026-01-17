import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { Card, CardContent, Badge, LoadingScreen, EmptyState, Button } from '../../components/ui';
import { IDEA_STATUS_LABELS, IdeaStatus } from '@forge/shared';

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  CAPTURED: 'default',
  INTERVIEWING: 'warning',
  RESEARCHING: 'info',
  COMPLETE: 'success',
};

const filters: Array<{ label: string; value: IdeaStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Captured', value: 'CAPTURED' },
  { label: 'Interviewing', value: 'INTERVIEWING' },
  { label: 'Researching', value: 'RESEARCHING' },
  { label: 'Complete', value: 'COMPLETE' },
];

export default function IdeasScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<IdeaStatus | 'ALL'>('ALL');

  const { data, isLoading, refetch, isRefetching } = trpc.idea.list.useQuery({});

  const allIdeas = data?.items ?? [];
  const ideas = filter === 'ALL' ? allIdeas : allIdeas.filter((idea) => idea.status === filter);

  if (isLoading && !isRefetching) {
    return <LoadingScreen message="Loading ideas..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-14 border-b border-gray-200 bg-white"
        contentContainerClassName="px-4 py-2"
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilter(f.value)}
            className={`mr-2 rounded-full px-4 py-2 ${
              filter === f.value ? 'bg-blue-600' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                filter === f.value ? 'text-white' : 'text-gray-700'
              }`}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {ideas.length === 0 ? (
          <EmptyState
            icon="bulb-outline"
            title={filter === 'ALL' ? 'No ideas yet' : `No ${filter.toLowerCase()} ideas`}
            description={
              filter === 'ALL'
                ? 'Create your first business idea to get started'
                : 'Try a different filter or create a new idea'
            }
            action={
              <Button onPress={() => router.push('/ideas/new')}>
                Create Idea
              </Button>
            }
          />
        ) : (
          <View className="space-y-3">
            {ideas.map((idea) => (
              <TouchableOpacity
                key={idea.id}
                onPress={() => router.push(`/ideas/${idea.id}`)}
              >
                <Card>
                  <CardContent>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="font-medium text-gray-900" numberOfLines={1}>
                          {idea.title}
                        </Text>
                        <Text className="mt-1 text-sm text-gray-500" numberOfLines={2}>
                          {idea.description}
                        </Text>
                        <Text className="mt-2 text-xs text-gray-400">
                          {new Date(idea.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Badge variant={statusVariants[idea.status]}>
                        {IDEA_STATUS_LABELS[idea.status]}
                      </Badge>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pagination Info */}
        {data && data.pagination.total > 0 && (
          <Text className="mt-4 text-center text-sm text-gray-500">
            Showing {ideas.length} of {data.pagination.total} ideas
          </Text>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-lg"
        onPress={() => router.push('/ideas/new')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

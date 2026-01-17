import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, Badge, LoadingScreen, EmptyState, Button } from '../../components/ui';
import { IDEA_STATUS_LABELS } from '@forge/shared';

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  CAPTURED: 'default',
  INTERVIEWING: 'warning',
  RESEARCHING: 'info',
  COMPLETE: 'success',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = trpc.user.stats.useQuery();
  const {
    data: ideasData,
    isLoading: ideasLoading,
    refetch,
    isRefetching,
  } = trpc.idea.list.useQuery({ limit: 5 });

  const isLoading = statsLoading || ideasLoading;
  const recentIdeas = ideasData?.items ?? [];

  if (isLoading && !isRefetching) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Welcome */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </Text>
          <Text className="mt-1 text-gray-500">Here's what's happening with your ideas</Text>
        </View>

        {/* Stats */}
        <View className="mb-6 flex-row space-x-3">
          <Card className="flex-1">
            <CardContent className="items-center py-4">
              <Text className="text-3xl font-bold text-blue-600">
                {stats?.totalIdeas ?? 0}
              </Text>
              <Text className="text-sm text-gray-500">Total Ideas</Text>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardContent className="items-center py-4">
              <Text className="text-3xl font-bold text-green-600">
                {stats?.ideasByStatus?.COMPLETE ?? 0}
              </Text>
              <Text className="text-sm text-gray-500">Completed</Text>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardContent className="items-center py-4">
              <Text className="text-3xl font-bold text-purple-600">
                {stats?.totalReports ?? 0}
              </Text>
              <Text className="text-sm text-gray-500">Reports</Text>
            </CardContent>
          </Card>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold text-gray-900">Quick Actions</Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 items-center rounded-xl bg-blue-600 p-4"
              onPress={() => router.push('/ideas/new')}
            >
              <Ionicons name="add-circle-outline" size={28} color="#fff" />
              <Text className="mt-2 font-medium text-white">New Idea</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 items-center rounded-xl bg-gray-100 p-4"
              onPress={() => router.push('/(tabs)/ideas')}
            >
              <Ionicons name="list-outline" size={28} color="#374151" />
              <Text className="mt-2 font-medium text-gray-700">View All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Ideas */}
        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">Recent Ideas</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/ideas')}>
              <Text className="text-blue-600">See all</Text>
            </TouchableOpacity>
          </View>

          {recentIdeas.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon="bulb-outline"
                  title="No ideas yet"
                  description="Capture your first business idea to get started"
                  action={
                    <Button onPress={() => router.push('/ideas/new')}>
                      Create Idea
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <View className="space-y-3">
              {recentIdeas.map((idea) => (
                <TouchableOpacity
                  key={idea.id}
                  onPress={() => router.push(`/ideas/${idea.id}`)}
                >
                  <Card>
                    <CardContent>
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <Text className="font-medium text-gray-900" numberOfLines={1}>
                            {idea.title}
                          </Text>
                          <Text className="mt-1 text-sm text-gray-500" numberOfLines={2}>
                            {idea.description}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../../lib/trpc';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  LoadingScreen,
  EmptyState,
} from '../../../components/ui';
import {
  IDEA_STATUS_LABELS,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_STATUS_LABELS,
  REPORT_TYPE_LABELS,
  REPORT_STATUS_LABELS,
} from '@forge/shared';

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  CAPTURED: 'default',
  INTERVIEWING: 'warning',
  RESEARCHING: 'info',
  COMPLETE: 'success',
};

const reportStatusVariants: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  GENERATING: 'warning',
  COMPLETE: 'success',
  FAILED: 'error',
};

export default function IdeaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: idea, isLoading, error, refetch, isRefetching } = trpc.idea.get.useQuery({ id });

  const startInterview = trpc.idea.startInterview.useMutation({
    onSuccess: () => {
      router.push(`/ideas/${id}/interview`);
    },
  });

  const startResearch = trpc.idea.startResearch.useMutation({
    onSuccess: () => {
      utils.idea.get.invalidate({ id });
    },
  });

  const deleteIdea = trpc.idea.delete.useMutation({
    onSuccess: () => {
      router.replace('/(tabs)/ideas');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Idea',
      'Are you sure you want to delete this idea? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteIdea.mutate({ id }),
        },
      ]
    );
  };

  if (isLoading && !isRefetching) {
    return <LoadingScreen message="Loading idea..." />;
  }

  if (error || !idea) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 p-4">
        <Card>
          <CardContent>
            <EmptyState
              icon="alert-circle-outline"
              title="Idea not found"
              description="This idea may have been deleted"
              action={
                <Button onPress={() => router.replace('/(tabs)/ideas')}>
                  Go to Ideas
                </Button>
              }
            />
          </CardContent>
        </Card>
      </SafeAreaView>
    );
  }

  const hasActiveInterview = idea.interviews?.some((i) => i.status === 'IN_PROGRESS');
  const hasCompletedInterview = idea.interviews?.some((i) => i.status === 'COMPLETE');
  const isResearching = idea.status === 'RESEARCHING';
  const hasResearch = idea.research?.status === 'COMPLETE';

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <Card className="mb-4">
          <CardContent>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">{idea.title}</Text>
                <Text className="mt-1 text-gray-500">{idea.description}</Text>
              </View>
              <Badge variant={statusVariants[idea.status]}>
                {IDEA_STATUS_LABELS[idea.status]}
              </Badge>
            </View>
            <Text className="mt-4 text-xs text-gray-400">
              Created {new Date(idea.createdAt).toLocaleDateString()}
            </Text>
          </CardContent>
        </Card>

        {/* Interviews */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Interviews</CardTitle>
            <CardDescription>AI-guided discovery sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {hasActiveInterview ? (
              <Button
                onPress={() => router.push(`/ideas/${id}/interview`)}
                leftIcon={<Ionicons name="chatbubbles" size={18} color="#fff" />}
              >
                Continue Interview
              </Button>
            ) : idea.interviews && idea.interviews.length > 0 ? (
              <View className="space-y-3">
                {idea.interviews.map((interview) => (
                  <View
                    key={interview.id}
                    className="flex-row items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <View>
                      <Text className="font-medium text-gray-900">
                        {INTERVIEW_MODE_LABELS[interview.mode]}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {new Date(interview.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Badge variant="success">
                      {INTERVIEW_STATUS_LABELS[interview.status] || interview.status}
                    </Badge>
                  </View>
                ))}
                <Button
                  variant="outline"
                  onPress={() => startInterview.mutate({ ideaId: id, mode: 'IN_DEPTH' })}
                  isLoading={startInterview.isPending}
                >
                  Start New Interview
                </Button>
              </View>
            ) : (
              <EmptyState
                icon="chatbubbles-outline"
                title="No interviews yet"
                description="Start an AI interview to discover insights"
                action={
                  <Button
                    onPress={() => startInterview.mutate({ ideaId: id, mode: 'LIGHT' })}
                    isLoading={startInterview.isPending}
                  >
                    Start Interview
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Research */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Research</CardTitle>
            <CardDescription>Market and competitive analysis</CardDescription>
          </CardHeader>
          <CardContent>
            {isResearching ? (
              <View className="items-center py-4">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Ionicons name="sync" size={24} color="#2563eb" />
                </View>
                <Text className="mt-3 font-medium text-gray-900">Research in Progress</Text>
                <Text className="mt-1 text-center text-sm text-gray-500">
                  Analyzing markets, competitors, and opportunities
                </Text>
                {idea.research && (
                  <Badge variant="info" className="mt-3">
                    {idea.research.currentPhase || 'Processing'}
                  </Badge>
                )}
              </View>
            ) : hasResearch ? (
              <View className="items-center py-4">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                </View>
                <Text className="mt-3 font-medium text-gray-900">Research Complete</Text>
                <Text className="mt-1 text-sm text-gray-500">
                  View your generated reports below
                </Text>
              </View>
            ) : hasCompletedInterview ? (
              <EmptyState
                icon="analytics-outline"
                title="Ready for research"
                description="Start comprehensive market research based on your interview"
                action={
                  <Button
                    onPress={() => startResearch.mutate({ id })}
                    isLoading={startResearch.isPending}
                  >
                    Start Research
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon="analytics-outline"
                title="Complete an interview first"
                description="Research requires interview data to generate insights"
              />
            )}
          </CardContent>
        </Card>

        {/* Reports */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>Generated business documents</CardDescription>
          </CardHeader>
          <CardContent>
            {idea.reports && idea.reports.length > 0 ? (
              <View className="space-y-3">
                {idea.reports.map((report) => (
                  <TouchableOpacity
                    key={report.id}
                    className="flex-row items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <View className="flex-1">
                      <Text className="font-medium text-gray-900" numberOfLines={1}>
                        {report.title}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {REPORT_TYPE_LABELS[report.type]}
                      </Text>
                    </View>
                    <Badge variant={reportStatusVariants[report.status]}>
                      {REPORT_STATUS_LABELS[report.status]}
                    </Badge>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="document-text-outline"
                title="No reports yet"
                description={
                  hasResearch
                    ? 'Reports will appear here once generated'
                    : 'Complete research to generate reports'
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="mb-4 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="danger"
              onPress={handleDelete}
              isLoading={deleteIdea.isPending}
              leftIcon={<Ionicons name="trash-outline" size={18} color="#fff" />}
            >
              Delete Idea
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { Card, CardContent, Badge, LoadingScreen, EmptyState } from '../../components/ui';
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS, ReportType } from '@forge/shared';

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  GENERATING: 'warning',
  COMPLETE: 'success',
  FAILED: 'error',
};

const reportTypes: Array<{ label: string; value: ReportType | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Business Plan', value: 'BUSINESS_PLAN' },
  { label: 'Positioning', value: 'POSITIONING' },
  { label: 'Competitive', value: 'COMPETITIVE_ANALYSIS' },
  { label: 'Why Now', value: 'WHY_NOW' },
];

export default function ReportsScreen() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<ReportType | 'ALL'>('ALL');

  const { data, isLoading, refetch, isRefetching } = trpc.report.list.useQuery({});

  const allReports = data?.items ?? [];
  const reports =
    typeFilter === 'ALL'
      ? allReports
      : allReports.filter((report) => report.type === typeFilter);

  if (isLoading && !isRefetching) {
    return <LoadingScreen message="Loading reports..." />;
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
        {reportTypes.map((t) => (
          <TouchableOpacity
            key={t.value}
            onPress={() => setTypeFilter(t.value)}
            className={`mr-2 rounded-full px-4 py-2 ${
              typeFilter === t.value ? 'bg-blue-600' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                typeFilter === t.value ? 'text-white' : 'text-gray-700'
              }`}
            >
              {t.label}
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
        {reports.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No reports yet"
            description="Reports are generated after completing research on your ideas"
          />
        ) : (
          <View className="space-y-3">
            {reports.map((report) => (
              <TouchableOpacity
                key={report.id}
                onPress={() => router.push(`/ideas/${report.ideaId}`)}
              >
                <Card>
                  <CardContent>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <View className="flex-row items-center">
                          <Ionicons
                            name="document-text"
                            size={16}
                            color="#6b7280"
                            style={{ marginRight: 6 }}
                          />
                          <Text className="flex-1 font-medium text-gray-900" numberOfLines={1}>
                            {report.title}
                          </Text>
                        </View>
                        <Text className="mt-1 text-sm text-gray-500">
                          {REPORT_TYPE_LABELS[report.type]}
                        </Text>
                        <Text className="mt-1 text-xs text-gray-400">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Badge variant={statusVariants[report.status]}>
                        {REPORT_STATUS_LABELS[report.status]}
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
            Showing {reports.length} of {data.pagination.total} reports
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

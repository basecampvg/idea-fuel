import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS, ReportType } from '@forge/shared';

// ideationLab Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
};

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: colors.muted, bg: colors.mutedBg },
  GENERATING: { color: colors.warning, bg: colors.warningMuted },
  COMPLETE: { color: colors.success, bg: colors.successMuted },
  FAILED: { color: colors.error, bg: colors.errorMuted },
};

const REPORT_TYPE_ICONS: Record<ReportType, keyof typeof Ionicons.glyphMap> = {
  BUSINESS_PLAN: 'briefcase-outline',
  POSITIONING: 'compass-outline',
  COMPETITIVE_ANALYSIS: 'people-outline',
  WHY_NOW: 'time-outline',
  PROOF_SIGNALS: 'checkmark-circle-outline',
  KEYWORDS_SEO: 'search-outline',
  CUSTOMER_PROFILE: 'person-outline',
  VALUE_EQUATION: 'calculator-outline',
  VALUE_LADDER: 'trending-up-outline',
  GO_TO_MARKET: 'rocket-outline',
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
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {reportTypes.map((t) => {
            const isActive = typeFilter === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => setTypeFilter(t.value)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="document-text-outline" size={48} color={colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyDescription}>
              Reports are generated after completing research on your ideas
            </Text>
          </View>
        ) : (
          <View style={styles.reportsList}>
            {reports.map((report) => {
              const statusStyle = STATUS_STYLES[report.status] || STATUS_STYLES.DRAFT;
              const typeIcon = REPORT_TYPE_ICONS[report.type] || 'document-text-outline';

              return (
                <TouchableOpacity
                  key={report.id}
                  onPress={() => router.push(`/ideas/${report.projectId}`)}
                  style={styles.reportCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.reportHeader}>
                    <View style={[styles.reportIconContainer, { backgroundColor: colors.accentMuted }]}>
                      <Ionicons name={typeIcon} size={20} color={colors.accent} />
                    </View>
                    <View style={styles.reportInfo}>
                      <Text style={styles.reportTitle} numberOfLines={1}>
                        {report.title}
                      </Text>
                      <Text style={styles.reportType}>
                        {REPORT_TYPE_LABELS[report.type]}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.color }]}>
                        {REPORT_STATUS_LABELS[report.status]}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reportFooter}>
                    <View style={styles.reportMeta}>
                      <Ionicons name="calendar-outline" size={14} color={colors.muted} />
                      <Text style={styles.reportDate}>
                        {new Date(report.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Pagination Info */}
        {data && data.pagination.total > 0 && (
          <Text style={styles.paginationText}>
            Showing {reports.length} of {data.pagination.total} reports
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: colors.muted,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.mutedBg,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.mutedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  reportsList: {
    gap: 12,
  },
  reportCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reportIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  reportType: {
    fontSize: 13,
    color: colors.muted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportDate: {
    fontSize: 13,
    color: colors.muted,
  },
  paginationText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 13,
    color: colors.muted,
  },
});

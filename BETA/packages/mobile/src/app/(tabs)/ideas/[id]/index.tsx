import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../../../lib/trpc';
import {
  IDEA_STATUS_LABELS,
  INTERVIEW_MODE_LABELS,
  REPORT_TYPE_LABELS,
  REPORT_STATUS_LABELS,
} from '@forge/shared';

// Analysis Components
import {
  ScoreCardsEnhanced,
  MarketSizingSection,
  KeywordChartSection,
  BusinessFitSection,
  CompetitorsSection,
  WhyNowSection,
  ProofSignalsSection,
  PainPointsSection,
  SocialProofSection,
  UserStorySection,
  OfferSection,
  TechStackSection,
  SparkResultsSection,
  NextStepPromotion,
} from '../../../../components/analysis';
import { getResearchJourneyState, type InterviewMode } from '@forge/shared';

// Forge Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  cardHover: '#242220',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  destructive: '#EF4444',
  destructiveMuted: 'rgba(239, 68, 68, 0.15)',
  // Status colors
  statusDraft: '#A1A1AA',
  statusInterview: '#FBBF24',
  statusResearch: '#60A5FA',
  statusComplete: '#34D399',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; muted: string }> = {
  CAPTURED: { bg: colors.mutedBg, text: colors.statusDraft, muted: 'rgba(161, 161, 170, 0.15)' },
  INTERVIEWING: { bg: colors.warningMuted, text: colors.warning, muted: colors.warningMuted },
  RESEARCHING: { bg: colors.infoMuted, text: colors.info, muted: colors.infoMuted },
  COMPLETE: { bg: colors.successMuted, text: colors.success, muted: colors.successMuted },
};

const MODE_COLORS: Record<string, { color: string; bg: string }> = {
  IN_DEPTH: { color: colors.primary, bg: colors.primaryMuted },
  LIGHT: { color: colors.accent, bg: colors.accentMuted },
  SPARK: { color: colors.warning, bg: colors.warningMuted },
};

const MODE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  IN_DEPTH: 'flame',
  LIGHT: 'flash-outline',
  SPARK: 'sparkles',
};

// Loading Screen
function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingSpinner}>
        <Ionicons name="flame" size={32} color={colors.primary} />
      </View>
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.CAPTURED;
  return (
    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
      <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
        {IDEA_STATUS_LABELS[status] || status}
      </Text>
    </View>
  );
}

// Section Header
function SectionHeader({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// Interview Card
function InterviewCard({
  interview,
  onContinue,
  onAbandon,
  isAbandoning,
}: {
  interview: {
    id: string;
    mode: string;
    status: string;
    currentTurn: number;
    maxTurns: number;
    confidenceScore: number;
    lastActiveAt: Date;
  };
  onContinue: () => void;
  onAbandon: () => void;
  isAbandoning: boolean;
}) {
  const modeStyle = MODE_COLORS[interview.mode] || MODE_COLORS.LIGHT;
  const modeIcon = MODE_ICONS[interview.mode] || 'chatbubbles';
  const progress = (interview.currentTurn / interview.maxTurns) * 100;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.interviewHeader}>
        <View style={[styles.interviewIcon, { backgroundColor: modeStyle.bg }]}>
          <Ionicons name="chatbubbles" size={24} color={modeStyle.color} />
        </View>
        <View style={styles.interviewHeaderText}>
          <Text style={styles.interviewTitle}>Interview in Progress</Text>
          <View style={[styles.modeBadge, { backgroundColor: modeStyle.bg }]}>
            <Ionicons name={modeIcon} size={12} color={modeStyle.color} />
            <Text style={[styles.modeBadgeText, { color: modeStyle.color }]}>
              {INTERVIEW_MODE_LABELS[interview.mode] || interview.mode}
            </Text>
          </View>
        </View>
        <View style={styles.turnCounter}>
          <Text style={styles.turnCounterValue}>
            {interview.currentTurn}
            <Text style={styles.turnCounterMax}>/{interview.maxTurns}</Text>
          </Text>
          <Text style={styles.turnCounterLabel}>turns</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(progress, 2)}%`, backgroundColor: modeStyle.color },
            ]}
          />
        </View>
        <View style={styles.progressStats}>
          <Text style={styles.progressText}>{Math.round(progress)}% complete</Text>
          <Text style={styles.confidenceText}>
            Confidence: <Text style={styles.confidenceValue}>{interview.confidenceScore}</Text>
          </Text>
        </View>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: modeStyle.color }]}
        onPress={onContinue}
        activeOpacity={0.8}
      >
        <Text style={styles.continueButtonText}>Continue Interview</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>

      {/* Abandon */}
      <TouchableOpacity
        style={styles.abandonButton}
        onPress={onAbandon}
        disabled={isAbandoning}
        activeOpacity={0.7}
      >
        <Ionicons name="close-circle-outline" size={16} color={colors.muted} />
        <Text style={styles.abandonButtonText}>
          {isAbandoning ? 'Abandoning...' : 'Abandon interview'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Research Progress Card
function ResearchProgressCard({ research }: { research: { currentPhase?: string; progress?: number } }) {
  return (
    <View style={styles.card}>
      <SectionHeader
        icon="analytics"
        iconColor={colors.info}
        iconBg={colors.infoMuted}
        title="Research in Progress"
        subtitle="Analyzing markets, competitors, and opportunities"
      />
      <View style={styles.researchProgress}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${research.progress || 0}%`, backgroundColor: colors.info },
            ]}
          />
        </View>
        <View style={styles.phaseContainer}>
          <Ionicons name="sync" size={14} color={colors.info} />
          <Text style={styles.phaseText}>{research.currentPhase || 'Processing...'}</Text>
        </View>
      </View>
    </View>
  );
}

// Score Card
function ScoreCard({
  label,
  score,
  color,
}: {
  label: string;
  score: number | null | undefined;
  color: string;
}) {
  const scoreValue = score ?? 0;
  return (
    <View style={styles.scoreCard}>
      <Text style={[styles.scoreValue, { color }]}>{scoreValue}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

// Report Card
function ReportCard({
  report,
  onPress,
}: {
  report: { id: string; title: string; type: string; status: string };
  onPress: () => void;
}) {
  const isComplete = report.status === 'COMPLETE';
  return (
    <TouchableOpacity style={styles.reportCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.reportIconContainer}>
        <Ionicons
          name={isComplete ? 'document-text' : 'document-text-outline'}
          size={20}
          color={isComplete ? colors.accent : colors.muted}
        />
      </View>
      <View style={styles.reportContent}>
        <Text style={styles.reportTitle} numberOfLines={1}>
          {report.title}
        </Text>
        <Text style={styles.reportType}>{REPORT_TYPE_LABELS[report.type] || report.type}</Text>
      </View>
      <View
        style={[
          styles.reportStatus,
          { backgroundColor: isComplete ? colors.successMuted : colors.mutedBg },
        ]}
      >
        <Text
          style={[styles.reportStatusText, { color: isComplete ? colors.success : colors.muted }]}
        >
          {REPORT_STATUS_LABELS[report.status] || report.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Locked Feature Preview
function LockedFeatures() {
  const features = [
    { icon: 'bar-chart', label: 'Market Research', color: colors.success },
    { icon: 'people', label: 'Competitor Analysis', color: colors.accent },
    { icon: 'trending-up', label: 'Opportunity Scores', color: colors.secondary },
    { icon: 'document-text', label: 'Business Reports', color: colors.warning },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.lockedHeader}>
        <View style={styles.lockedIcon}>
          <Ionicons name="lock-closed" size={16} color={colors.muted} />
        </View>
        <View>
          <Text style={styles.lockedTitle}>Coming Next</Text>
          <Text style={styles.lockedSubtitle}>Unlocks after completing the interview</Text>
        </View>
      </View>
      <View style={styles.lockedGrid}>
        {features.map((feature) => (
          <View key={feature.label} style={styles.lockedFeature}>
            <View style={[styles.lockedFeatureIcon, { backgroundColor: `${feature.color}15` }]}>
              <Ionicons name={feature.icon as any} size={16} color={feature.color} />
            </View>
            <Text style={styles.lockedFeatureLabel}>{feature.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function IdeaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: idea, isLoading, error, refetch, isRefetching } = trpc.idea.get.useQuery({ id });

  const startInterview = trpc.idea.startInterview.useMutation({
    onSuccess: () => {
      router.push(`/(tabs)/ideas/${id}/interview` as never);
    },
  });

  const abandonInterview = trpc.interview.abandon.useMutation({
    onSuccess: () => {
      utils.idea.get.invalidate({ id });
    },
  });

  const startResearch = trpc.research.start.useMutation({
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

  const handleAbandon = () => {
    if (!activeInterview) return;
    Alert.alert(
      'Abandon Interview',
      'Are you sure you want to abandon this interview? You can start a new one later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: () => abandonInterview.mutate({ id: activeInterview.id }),
        },
      ]
    );
  };

  if (isLoading && !isRefetching) {
    return <LoadingScreen message="Loading idea..." />;
  }

  if (error || !idea) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={48} color={colors.destructive} />
          </View>
          <Text style={styles.errorTitle}>Idea not found</Text>
          <Text style={styles.errorMessage}>This idea may have been deleted</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.replace('/(tabs)/ideas')}
          >
            <Text style={styles.errorButtonText}>Go to Vault</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeInterview = idea.interviews?.find((i) => i.status === 'IN_PROGRESS');
  const completedInterview = idea.interviews?.find((i) => i.status === 'COMPLETE');
  const isResearching = idea.status === 'RESEARCHING';
  const isComplete = idea.status === 'COMPLETE';
  const hasResearch = idea.research?.status === 'COMPLETE';

  // Calculate journey state for next step promotion
  const journeyState = getResearchJourneyState({
    idea: { status: idea.status },
    interview: completedInterview ? {
      mode: completedInterview.mode as InterviewMode,
      status: completedInterview.status as 'IN_PROGRESS' | 'COMPLETE' | 'ABANDONED',
    } : null,
    research: idea.research ? {
      sparkStatus: (idea.research as any)?.sparkStatus || null,
      sparkResult: (idea.research as any)?.sparkResult || null,
      status: idea.research.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED',
    } : null,
  });

  const handleStartMode = (mode: InterviewMode) => {
    startInterview.mutate({ ideaId: id, mode });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {idea.title}
            </Text>
            <StatusBadge status={idea.status} />
          </View>
          <Text style={styles.headerDescription} numberOfLines={3}>
            {idea.description}
          </Text>
          <Text style={styles.headerDate}>
            Created {new Date(idea.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Status: CAPTURED - Start Interview */}
        {idea.status === 'CAPTURED' && (
          <View style={styles.card}>
            <SectionHeader
              icon="chatbubbles"
              iconColor={colors.primary}
              iconBg={colors.primaryMuted}
              title="Start Discovery"
              subtitle="Begin an AI-guided interview to explore your idea"
            />
            <View style={styles.modeSelection}>
              {(['IN_DEPTH', 'LIGHT', 'SPARK'] as const).map((mode) => {
                const modeStyle = MODE_COLORS[mode];
                const modeIcon = MODE_ICONS[mode];
                return (
                  <TouchableOpacity
                    key={mode}
                    style={styles.modeOption}
                    onPress={() => startInterview.mutate({ ideaId: id, mode })}
                    disabled={startInterview.isPending}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modeOptionIcon, { backgroundColor: modeStyle.bg }]}>
                      <Ionicons name={modeIcon} size={20} color={modeStyle.color} />
                    </View>
                    <View style={styles.modeOptionText}>
                      <Text style={styles.modeOptionLabel}>
                        {INTERVIEW_MODE_LABELS[mode] || mode}
                      </Text>
                      <Text style={styles.modeOptionDescription}>
                        {mode === 'IN_DEPTH' && '65 questions - comprehensive'}
                        {mode === 'LIGHT' && '10 questions - essential'}
                        {mode === 'SPARK' && 'Quick validation'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Status: INTERVIEWING */}
        {idea.status === 'INTERVIEWING' && activeInterview && (
          <>
            <InterviewCard
              interview={activeInterview as any}
              onContinue={() => router.push(`/(tabs)/ideas/${id}/interview` as never)}
              onAbandon={handleAbandon}
              isAbandoning={abandonInterview.isPending}
            />
            <LockedFeatures />
          </>
        )}

        {/* Status: RESEARCHING */}
        {isResearching && idea.research && (
          <ResearchProgressCard research={idea.research as any} />
        )}

        {/* Status: COMPLETE */}
        {isComplete && hasResearch && (
          <>
            {/* Next Step Promotion Banner */}
            <NextStepPromotion
              ideaId={id}
              journeyState={journeyState}
              onStartMode={handleStartMode}
              isStarting={startInterview.isPending}
            />

            {/* Spark Results (for SPARK mode ideas) */}
            {(idea.research as any)?.sparkResult && (
              <SparkResultsSection sparkResult={(idea.research as any).sparkResult} />
            )}

            {/* User Story */}
            <UserStorySection userStory={(idea.research as any)?.userStory} />

            {/* Score Cards with Justifications */}
            <ScoreCardsEnhanced
              scores={{
                opportunity: (idea.research as any)?.opportunityScore,
                problem: (idea.research as any)?.problemScore,
                feasibility: (idea.research as any)?.feasibilityScore,
                whyNow: (idea.research as any)?.whyNowScore,
              }}
              justifications={(idea.research as any)?.scoreJustifications}
            />

            {/* Market Sizing (TAM/SAM/SOM) */}
            <MarketSizingSection marketSizing={(idea.research as any)?.marketSizing} />

            {/* Keyword Trends Chart */}
            <KeywordChartSection keywordTrends={(idea.research as any)?.keywordTrends} />

            {/* Business Fit Metrics */}
            <BusinessFitSection
              revenuePotential={(idea.research as any)?.revenuePotential}
              executionDifficulty={(idea.research as any)?.executionDifficulty}
              gtmClarity={(idea.research as any)?.gtmClarity}
              founderFit={(idea.research as any)?.founderFit}
            />

            {/* Tech Stack Recommendations */}
            <TechStackSection techStack={(idea.research as any)?.techStack} />

            {/* Value Ladder / Offer Tiers */}
            <OfferSection offerTiers={(idea.research as any)?.valueLadder} />

            {/* Why Now - Market Timing */}
            <WhyNowSection whyNow={(idea.research as any)?.whyNow} />

            {/* Proof Signals - Demand Validation */}
            <ProofSignalsSection proofSignals={(idea.research as any)?.proofSignals} />

            {/* Social Proof */}
            <SocialProofSection socialProof={(idea.research as any)?.socialProof} />

            {/* Competitors */}
            <CompetitorsSection competitors={(idea.research as any)?.competitors} />

            {/* Pain Points */}
            <PainPointsSection painPoints={(idea.research as any)?.painPoints} />

            {/* Reports */}
            {idea.reports && idea.reports.length > 0 && (
              <View style={styles.card}>
                <SectionHeader
                  icon="document-text"
                  iconColor={colors.accent}
                  iconBg={colors.accentMuted}
                  title="Your Reports"
                  subtitle="Generated business documents"
                />
                <View style={styles.reportsList}>
                  {idea.reports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report as any}
                      onPress={() => {}}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Interview Summary */}
            {completedInterview && (
              <View style={styles.card}>
                <SectionHeader
                  icon="checkmark-circle"
                  iconColor={colors.success}
                  iconBg={colors.successMuted}
                  title="Interview Complete"
                  subtitle={`${INTERVIEW_MODE_LABELS[completedInterview.mode]} • Confidence: ${completedInterview.confidenceScore}`}
                />
                <TouchableOpacity
                  style={styles.viewInterviewButton}
                  onPress={() => router.push(`/(tabs)/ideas/${id}/interview` as never)}
                >
                  <Text style={styles.viewInterviewText}>View Full Interview</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Ready for Research */}
        {completedInterview && !isResearching && !hasResearch && idea.status !== 'COMPLETE' && (
          <View style={styles.card}>
            <SectionHeader
              icon="analytics"
              iconColor={colors.info}
              iconBg={colors.infoMuted}
              title="Ready for Research"
              subtitle="Start comprehensive market analysis"
            />
            <TouchableOpacity
              style={styles.startResearchButton}
              onPress={() => startResearch.mutate({ ideaId: id })}
              disabled={startResearch.isPending}
              activeOpacity={0.8}
            >
              {startResearch.isPending ? (
                <Text style={styles.startResearchText}>Starting...</Text>
              ) : (
                <>
                  <Text style={styles.startResearchText}>Start Research</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleteIdea.isPending}
        >
          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
          <Text style={styles.deleteButtonText}>
            {deleteIdea.isPending ? 'Deleting...' : 'Delete Idea'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 24,
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Header Card
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerDescription: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 12,
  },
  headerDate: {
    fontSize: 12,
    color: colors.muted,
    opacity: 0.7,
  },
  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  // Interview Card
  interviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  interviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  interviewHeaderText: {
    flex: 1,
  },
  interviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 6,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  turnCounter: {
    alignItems: 'flex-end',
  },
  turnCounterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
  },
  turnCounterMax: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.muted,
  },
  turnCounterLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    color: colors.muted,
  },
  confidenceText: {
    fontSize: 12,
    color: colors.muted,
  },
  confidenceValue: {
    color: colors.foreground,
    fontWeight: '500',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  abandonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  abandonButtonText: {
    fontSize: 13,
    color: colors.muted,
  },
  // Research Progress
  researchProgress: {
    marginTop: 8,
  },
  phaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  phaseText: {
    fontSize: 13,
    color: colors.info,
    fontWeight: '500',
  },
  // Mode Selection
  modeSelection: {
    gap: 12,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.mutedBg,
  },
  modeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modeOptionText: {
    flex: 1,
  },
  modeOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  modeOptionDescription: {
    fontSize: 12,
    color: colors.muted,
  },
  // Locked Features
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mutedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  lockedSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  lockedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lockedFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.mutedBg,
    opacity: 0.5,
    gap: 8,
  },
  lockedFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedFeatureLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  // Scores
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  scoreCard: {
    width: '47%',
    backgroundColor: colors.mutedBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  // Reports
  reportsList: {
    gap: 10,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.mutedBg,
  },
  reportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  reportType: {
    fontSize: 12,
    color: colors.muted,
  },
  reportStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reportStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // View Interview Button
  viewInterviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewInterviewText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
  // Start Research Button
  startResearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.info,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  startResearchText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.destructiveMuted,
    gap: 8,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    color: colors.destructive,
    fontWeight: '500',
  },
});

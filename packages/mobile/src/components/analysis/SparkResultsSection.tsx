import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { CollapsibleSection } from '../ui/CollapsibleSection';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const colors = {
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  destructive: '#EF4444',
  destructiveMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
};

const VERDICT_CONFIG = {
  proceed: { color: colors.success, bg: colors.successMuted, label: 'Proceed' },
  watchlist: { color: colors.warning, bg: colors.warningMuted, label: 'Watchlist' },
  drop: { color: colors.destructive, bg: colors.destructiveMuted, label: 'Drop' },
};

const DIRECTION_CONFIG = {
  rising: { color: colors.success, label: '↑ Rising' },
  flat: { color: colors.warning, label: '→ Flat' },
  declining: { color: colors.destructive, label: '↓ Declining' },
  unknown: { color: colors.muted, label: '? Unknown' },
};

interface SparkKeywordTrend {
  keyword: string;
  volume: number;
  growth: 'rising' | 'stable' | 'declining';
  trend: Array<{ date: string; value: number }>;
}

interface SparkRedditThread {
  title: string;
  subreddit?: string;
  url?: string;
  signal?: string;
  upvotes?: number;
  comments?: number;
  posted?: string;
}

interface SparkFacebookGroup {
  name: string;
  members?: string;
  privacy?: 'public' | 'private' | 'unknown';
  url?: string;
  fit_score?: number;
  why_relevant?: string;
}

interface SparkTAM {
  currency?: string;
  low: number;
  base: number;
  high: number;
  method?: string;
  assumptions?: string[];
  citations?: Array<{ label: string; url: string }>;
}

interface SectionQuality {
  section: string;
  confidence: 'high' | 'medium' | 'low';
  queriesRun: number;
  resultsFound: number;
  details: string;
}

interface DataQualityReport {
  overall: 'high' | 'medium' | 'low';
  sections: SectionQuality[];
  summary: string;
  queriedTopics: string[];
}

interface SparkResult {
  idea?: string;
  keywords?: { phrases?: string[] };
  trend_signal?: {
    direction?: 'rising' | 'flat' | 'declining' | 'unknown';
    evidence?: Array<{ claim: string }>;
  };
  reddit?: {
    top_threads?: SparkRedditThread[];
    recurring_pains?: string[];
    willingness_to_pay_clues?: string[];
  };
  facebook_groups?: SparkFacebookGroup[];
  tam?: SparkTAM;
  competitors?: Array<{
    name: string;
    description?: string;
    strengths?: string[];
    weaknesses?: string[];
  }>;
  verdict?: 'proceed' | 'watchlist' | 'drop';
  summary?: string;
  keyword_trends?: SparkKeywordTrend[];
  data_quality?: DataQualityReport;
}

interface SparkResultsSectionProps {
  sparkResult?: SparkResult | null;
}

function VerdictCard({ verdict, summary }: { verdict: 'proceed' | 'watchlist' | 'drop'; summary?: string }) {
  const config = VERDICT_CONFIG[verdict];

  return (
    <View style={[styles.verdictCard, { backgroundColor: config.bg, borderColor: config.color }]}>
      <View style={[styles.verdictBadge, { backgroundColor: config.color }]}>
        <Text style={styles.verdictBadgeText}>{config.label}</Text>
      </View>
      {summary && <Text style={styles.verdictSummary}>{summary}</Text>}
    </View>
  );
}

function TrendSignal({ direction, evidence }: { direction?: string; evidence?: Array<{ claim: string }> }) {
  const config = DIRECTION_CONFIG[direction as keyof typeof DIRECTION_CONFIG] || DIRECTION_CONFIG.unknown;

  return (
    <View style={styles.trendSection}>
      <View style={styles.trendHeader}>
        <Ionicons name="trending-up" size={16} color={config.color} />
        <Text style={[styles.trendLabel, { color: config.color }]}>{config.label}</Text>
      </View>
      {evidence && evidence.length > 0 && (
        <View style={styles.evidenceList}>
          {evidence.slice(0, 3).map((e, i) => (
            <Text key={i} style={styles.evidenceItem}>• {e.claim}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function KeywordTrendsChart({ keywordTrends }: { keywordTrends: SparkKeywordTrend[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!keywordTrends || keywordTrends.length === 0) return null;

  const selectedKeyword = keywordTrends[selectedIndex];
  const chartData = useMemo(() => {
    return (selectedKeyword?.trend || []).map((point) => ({
      value: point.value,
    }));
  }, [selectedKeyword]);

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const growthColor = selectedKeyword?.growth === 'rising' ? colors.success :
                      selectedKeyword?.growth === 'declining' ? colors.destructive : colors.warning;

  return (
    <View style={styles.chartSection}>
      <Text style={styles.sectionTitle}>Keyword Trends</Text>

      {/* Keyword Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
        {keywordTrends.slice(0, 6).map((kw, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.keywordPill, i === selectedIndex && styles.keywordPillActive]}
            onPress={() => setSelectedIndex(i)}
            activeOpacity={0.7}
          >
            <Text style={[styles.keywordPillText, i === selectedIndex && styles.keywordPillTextActive]}>
              {kw.keyword}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats */}
      <View style={styles.chartStats}>
        <Text style={styles.chartStatLabel}>Volume: {selectedKeyword?.volume || 0}</Text>
        <Text style={[styles.chartStatLabel, { color: growthColor }]}>
          {selectedKeyword?.growth || 'stable'}
        </Text>
      </View>

      {/* Chart */}
      {chartData.length > 0 && (
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={SCREEN_WIDTH - 80}
            height={120}
            spacing={(SCREEN_WIDTH - 100) / Math.min(chartData.length, 12)}
            color={colors.primary}
            thickness={2}
            hideDataPoints
            hideRules
            hideYAxisText
            hideAxesAndRules
            curved
            areaChart
            startFillColor={colors.primary}
            endFillColor="transparent"
            startOpacity={0.3}
            endOpacity={0}
            maxValue={maxValue * 1.1}
            noOfSections={4}
            yAxisColor="transparent"
            xAxisColor="transparent"
          />
        </View>
      )}
    </View>
  );
}

function TAMSection({ tam }: { tam: SparkTAM }) {
  const [expanded, setExpanded] = useState(false);

  const formatValue = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val}`;
  };

  return (
    <View style={styles.tamSection}>
      <TouchableOpacity
        style={styles.tamHeader}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpanded(!expanded);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionTitle}>TAM Estimate</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
      </TouchableOpacity>

      <View style={styles.tamValues}>
        <View style={styles.tamValue}>
          <Text style={styles.tamLabel}>Conservative</Text>
          <Text style={[styles.tamAmount, { color: colors.muted }]}>{formatValue(tam.low)}</Text>
        </View>
        <View style={styles.tamValue}>
          <Text style={styles.tamLabel}>Base</Text>
          <Text style={[styles.tamAmount, { color: colors.foreground }]}>{formatValue(tam.base)}</Text>
        </View>
        <View style={styles.tamValue}>
          <Text style={styles.tamLabel}>Optimistic</Text>
          <Text style={[styles.tamAmount, { color: colors.success }]}>{formatValue(tam.high)}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.tamDetails}>
          {tam.assumptions && tam.assumptions.length > 0 && (
            <View style={styles.tamAssumptions}>
              <Text style={styles.tamSubtitle}>Assumptions</Text>
              {tam.assumptions.slice(0, 3).map((a, i) => (
                <Text key={i} style={styles.tamAssumption}>• {a}</Text>
              ))}
            </View>
          )}
          {tam.citations && tam.citations.length > 0 && (
            <View style={styles.tamCitations}>
              <Text style={styles.tamSubtitle}>Sources</Text>
              {tam.citations.slice(0, 3).map((c, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => c.url && Linking.openURL(c.url)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tamCitation}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function RedditSection({ reddit }: { reddit: SparkResult['reddit'] }) {
  if (!reddit) return null;

  return (
    <CollapsibleSection
      icon="logo-reddit"
      iconColor="#ff4500"
      iconBgColor="rgba(255, 69, 0, 0.15)"
      title="Reddit Signals"
      subtitle={`${reddit.top_threads?.length || 0} threads found`}
      defaultCollapsed={true}
    >
      {/* Top Threads */}
      {reddit.top_threads && reddit.top_threads.length > 0 && (
        <View style={styles.threadsList}>
          {reddit.top_threads.slice(0, 3).map((thread, i) => (
            <TouchableOpacity
              key={i}
              style={styles.threadCard}
              onPress={() => thread.url && Linking.openURL(thread.url)}
              activeOpacity={thread.url ? 0.7 : 1}
            >
              <Text style={styles.threadTitle} numberOfLines={2}>{thread.title}</Text>
              <View style={styles.threadMeta}>
                {thread.subreddit && <Text style={styles.threadSubreddit}>r/{thread.subreddit}</Text>}
                {thread.upvotes !== undefined && <Text style={styles.threadStat}>↑{thread.upvotes}</Text>}
                {thread.comments !== undefined && <Text style={styles.threadStat}>💬{thread.comments}</Text>}
              </View>
              {thread.signal && <Text style={styles.threadSignal}>{thread.signal}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recurring Pains */}
      {reddit.recurring_pains && reddit.recurring_pains.length > 0 && (
        <View style={styles.painsSection}>
          <Text style={styles.painsSectionTitle}>Recurring Pain Points</Text>
          <View style={styles.painsPills}>
            {reddit.recurring_pains.slice(0, 5).map((pain, i) => (
              <View key={i} style={styles.painPill}>
                <Text style={styles.painPillText}>{pain}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* WTP Clues */}
      {reddit.willingness_to_pay_clues && reddit.willingness_to_pay_clues.length > 0 && (
        <View style={styles.wtpSection}>
          <Text style={styles.wtpSectionTitle}>💰 Willingness to Pay</Text>
          {reddit.willingness_to_pay_clues.slice(0, 3).map((clue, i) => (
            <Text key={i} style={styles.wtpClue}>• {clue}</Text>
          ))}
        </View>
      )}
    </CollapsibleSection>
  );
}

function FacebookSection({ groups }: { groups: SparkFacebookGroup[] }) {
  if (!groups || groups.length === 0) return null;

  return (
    <CollapsibleSection
      icon="logo-facebook"
      iconColor="#1877f2"
      iconBgColor="rgba(24, 119, 242, 0.15)"
      title="Facebook Groups"
      subtitle={`${groups.length} group${groups.length > 1 ? 's' : ''} found`}
      defaultCollapsed={true}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {groups.slice(0, 4).map((group, i) => (
          <TouchableOpacity
            key={i}
            style={styles.groupCard}
            onPress={() => group.url && Linking.openURL(group.url)}
            activeOpacity={group.url ? 0.7 : 1}
          >
            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
            {group.members && <Text style={styles.groupMembers}>{group.members}</Text>}
            {group.fit_score !== undefined && (
              <View style={styles.fitScoreContainer}>
                <Text style={styles.fitScoreLabel}>Fit:</Text>
                {[1, 2, 3].map((s) => (
                  <View
                    key={s}
                    style={[styles.fitDot, { backgroundColor: s <= group.fit_score! ? colors.success : colors.mutedBg }]}
                  />
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </CollapsibleSection>
  );
}

const CONFIDENCE_CONFIG = {
  high: { color: colors.success, bg: colors.successMuted, label: 'High', icon: 'shield-checkmark' as const, barFlex: 1 },
  medium: { color: colors.warning, bg: colors.warningMuted, label: 'Medium', icon: 'shield-half' as const, barFlex: 0.66 },
  low: { color: colors.destructive, bg: colors.destructiveMuted, label: 'Low', icon: 'shield' as const, barFlex: 0.33 },
};

const SECTION_LABELS: Record<string, string> = {
  demand: 'Demand Signals',
  tam: 'Market Sizing',
  competitors: 'Competitors',
};

function DataQualityBanner({ quality }: { quality: DataQualityReport }) {
  const [expanded, setExpanded] = useState(false);
  const config = CONFIDENCE_CONFIG[quality.overall] || CONFIDENCE_CONFIG.low;

  return (
    <TouchableOpacity
      style={[dqStyles.container, { backgroundColor: config.bg, borderColor: config.color + '40' }]}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
      }}
      activeOpacity={0.8}
    >
      <View style={dqStyles.header}>
        <View style={[dqStyles.iconWrap, { backgroundColor: config.color + '25' }]}>
          <Ionicons name={config.icon} size={16} color={config.color} />
        </View>
        <View style={dqStyles.headerText}>
          <Text style={dqStyles.headerLabel}>
            Data Confidence: <Text style={{ color: config.color }}>{config.label}</Text>
          </Text>
          <Text style={dqStyles.headerSummary} numberOfLines={expanded ? undefined : 1}>
            {quality.summary}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
      </View>

      {expanded && (
        <View style={dqStyles.sections}>
          {quality.sections.map((section) => {
            const sConfig = CONFIDENCE_CONFIG[section.confidence] || CONFIDENCE_CONFIG.low;
            return (
              <View key={section.section} style={dqStyles.sectionRow}>
                <View style={dqStyles.sectionLabel}>
                  <Text style={dqStyles.sectionName}>
                    {SECTION_LABELS[section.section] || section.section}
                  </Text>
                  <Text style={[dqStyles.sectionConfidence, { color: sConfig.color }]}>
                    {sConfig.label}
                  </Text>
                </View>
                <View style={dqStyles.barTrack}>
                  <View style={[dqStyles.barFill, { flex: sConfig.barFlex, backgroundColor: sConfig.color }]} />
                  <View style={{ flex: 1 - sConfig.barFlex }} />
                </View>
                <Text style={dqStyles.sectionDetail}>{section.details}</Text>
              </View>
            );
          })}
          {quality.queriedTopics.length > 0 && (
            <Text style={dqStyles.topicCount}>
              Searched {quality.queriedTopics.length} query variations
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const dqStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  headerSummary: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  sections: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  sectionRow: {},
  sectionLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionName: {
    fontSize: 11,
    color: colors.muted,
  },
  sectionConfidence: {
    fontSize: 11,
    fontWeight: '600',
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.mutedBg,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 3,
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  sectionDetail: {
    fontSize: 10,
    color: colors.muted,
    opacity: 0.7,
  },
  topicCount: {
    fontSize: 10,
    color: colors.muted,
    opacity: 0.5,
    marginTop: 4,
  },
});

export function SparkResultsSection({ sparkResult }: SparkResultsSectionProps) {
  if (!sparkResult) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.warningMuted }]}>
          <Ionicons name="sparkles" size={20} color={colors.warning} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Spark Validation</Text>
          <Text style={styles.subtitle}>Quick market assessment</Text>
        </View>
      </View>

      {/* Verdict */}
      {sparkResult.verdict && (
        <VerdictCard verdict={sparkResult.verdict} summary={sparkResult.summary} />
      )}

      {/* Data Quality */}
      {sparkResult.data_quality && (
        <DataQualityBanner quality={sparkResult.data_quality} />
      )}

      {/* Trend Signal */}
      {sparkResult.trend_signal && (
        <TrendSignal
          direction={sparkResult.trend_signal.direction}
          evidence={sparkResult.trend_signal.evidence}
        />
      )}

      {/* Keywords */}
      {sparkResult.keywords?.phrases && sparkResult.keywords.phrases.length > 0 && (
        <View style={styles.keywordsSection}>
          <Text style={styles.sectionTitle}>Target Keywords</Text>
          <View style={styles.keywordsPills}>
            {sparkResult.keywords.phrases.slice(0, 6).map((phrase, i) => (
              <View key={i} style={styles.keywordTag}>
                <Text style={styles.keywordTagText}>{phrase}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Keyword Trends Chart */}
      {sparkResult.keyword_trends && sparkResult.keyword_trends.length > 0 && (
        <KeywordTrendsChart keywordTrends={sparkResult.keyword_trends} />
      )}

      {/* TAM */}
      {sparkResult.tam && <TAMSection tam={sparkResult.tam} />}

      {/* Reddit */}
      <RedditSection reddit={sparkResult.reddit} />

      {/* Facebook */}
      <FacebookSection groups={sparkResult.facebook_groups || []} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  verdictCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  verdictBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  verdictBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  verdictSummary: {
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 18,
  },
  trendSection: {
    marginBottom: 16,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  evidenceList: {
    paddingLeft: 8,
  },
  evidenceItem: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 4,
  },
  keywordsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  keywordsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordTag: {
    backgroundColor: colors.mutedBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  keywordTagText: {
    fontSize: 12,
    color: colors.foreground,
  },
  chartSection: {
    marginBottom: 16,
  },
  pillsScroll: {
    marginBottom: 8,
  },
  keywordPill: {
    backgroundColor: colors.mutedBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  keywordPillActive: {
    backgroundColor: colors.primaryMuted,
  },
  keywordPillText: {
    fontSize: 12,
    color: colors.muted,
  },
  keywordPillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chartStatLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  chartContainer: {
    marginLeft: -8,
  },
  tamSection: {
    marginBottom: 16,
  },
  tamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tamValues: {
    flexDirection: 'row',
    gap: 12,
  },
  tamValue: {
    flex: 1,
    backgroundColor: colors.mutedBg,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  tamLabel: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 4,
  },
  tamAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  tamDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tamAssumptions: {
    marginBottom: 12,
  },
  tamSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 6,
  },
  tamAssumption: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    marginBottom: 2,
  },
  tamCitations: {},
  tamCitation: {
    fontSize: 11,
    color: colors.info,
    marginBottom: 4,
  },
  threadsList: {
    gap: 10,
    marginBottom: 12,
  },
  threadCard: {
    backgroundColor: colors.mutedBg,
    borderRadius: 10,
    padding: 12,
  },
  threadTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 6,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  threadSubreddit: {
    fontSize: 11,
    color: '#ff4500',
    fontWeight: '500',
  },
  threadStat: {
    fontSize: 11,
    color: colors.muted,
  },
  threadSignal: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  painsSection: {
    marginBottom: 12,
  },
  painsSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 6,
  },
  painsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  painPill: {
    backgroundColor: colors.destructiveMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  painPillText: {
    fontSize: 11,
    color: colors.destructive,
  },
  wtpSection: {},
  wtpSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 6,
  },
  wtpClue: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    marginBottom: 2,
  },
  groupCard: {
    width: 180,
    backgroundColor: colors.mutedBg,
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
  },
  groupName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 6,
  },
  fitScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fitScoreLabel: {
    fontSize: 10,
    color: colors.muted,
    marginRight: 4,
  },
  fitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default SparkResultsSection;

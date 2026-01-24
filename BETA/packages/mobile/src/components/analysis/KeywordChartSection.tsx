import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const colors = {
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  success: '#22C55E',
  destructive: '#EF4444',
};

interface KeywordTrend {
  keyword: string;
  volume: number;
  growth: number;
  trend: number[];
}

interface KeywordChartSectionProps {
  keywordTrends?: KeywordTrend[] | null;
}

type TimeframeOption = '12mo' | '2yr' | '5yr';

const TIMEFRAME_OPTIONS: { value: TimeframeOption; label: string; months: number }[] = [
  { value: '12mo', label: '12 Months', months: 12 },
  { value: '2yr', label: '2 Years', months: 24 },
  { value: '5yr', label: '5 Years', months: 60 },
];

export function KeywordChartSection({ keywordTrends }: KeywordChartSectionProps) {
  const [selectedKeywordIndex, setSelectedKeywordIndex] = useState(0);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('12mo');
  const [showKeywordPicker, setShowKeywordPicker] = useState(false);

  const keywords = keywordTrends || [];

  if (keywords.length === 0) return null;

  const selectedKeyword = keywords[selectedKeywordIndex];
  const timeframeConfig = TIMEFRAME_OPTIONS.find((t) => t.value === timeframe)!;

  // Generate date info for each data point
  const getDateLabels = (numMonths: number): { label: string; fullDate: string }[] => {
    const labels: { label: string; fullDate: string }[] = [];
    const now = new Date();

    for (let i = numMonths - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear().toString();
      const shortYear = year.slice(-2);

      labels.push({
        label: '', // Will be set below based on interval
        fullDate: `${month} ${year}`,
      });
    }

    // Determine label interval based on timeframe
    const labelInterval = numMonths <= 12 ? 3 : numMonths <= 24 ? 6 : 12;

    // Set labels at intervals, always including first and last
    labels.forEach((item, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (numMonths - 1 - index), 1);
      const year = date.getFullYear().toString().slice(-2);

      if (index === 0 || index === labels.length - 1 || index % labelInterval === 0) {
        item.label = `'${year}`;
      }
    });

    return labels;
  };

  // Format volume for Y-axis
  const formatVolume = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  // Generate date labels for the timeframe
  const dateLabels = useMemo(() => {
    return getDateLabels(timeframeConfig.months);
  }, [timeframe]);

  // Prepare chart data with date info for tooltips
  const chartData = useMemo(() => {
    if (!selectedKeyword?.trend) return [];

    const trendData = selectedKeyword.trend.slice(-timeframeConfig.months);
    return trendData.map((value, index) => ({
      value,
      label: dateLabels[index]?.fullDate || '',
    }));
  }, [selectedKeyword, timeframe, dateLabels]);

  // X-axis labels (just the year markers)
  const xAxisLabels = useMemo(() => {
    return dateLabels.map((d) => d.label);
  }, [dateLabels]);

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const growth = selectedKeyword?.growth || 0;
  const isEmerging = growth >= 500;
  const isPositive = growth >= 0;
  const growthColor = isEmerging ? colors.primary : isPositive ? colors.success : colors.destructive;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name="trending-up" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Keyword Trends</Text>
          <Text style={styles.subtitle}>Search volume over time</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Keyword Selector */}
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowKeywordPicker(!showKeywordPicker)}
          activeOpacity={0.7}
        >
          <Text style={styles.selectorText} numberOfLines={1}>
            {selectedKeyword?.keyword || 'Select keyword'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </TouchableOpacity>

        {/* Timeframe Toggle */}
        <View style={styles.timeframeToggle}>
          {TIMEFRAME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.timeframeOption,
                timeframe === opt.value && styles.timeframeOptionActive,
              ]}
              onPress={() => setTimeframe(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeframeOptionText,
                  timeframe === opt.value && styles.timeframeOptionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Keyword Picker Dropdown */}
      {showKeywordPicker && (
        <ScrollView style={styles.keywordPicker} nestedScrollEnabled>
          {keywords.map((kw, index) => (
            <TouchableOpacity
              key={kw.keyword}
              style={[
                styles.keywordOption,
                index === selectedKeywordIndex && styles.keywordOptionActive,
              ]}
              onPress={() => {
                setSelectedKeywordIndex(index);
                setShowKeywordPicker(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.keywordOptionText,
                  index === selectedKeywordIndex && styles.keywordOptionTextActive,
                ]}
                numberOfLines={1}
              >
                {kw.keyword}
              </Text>
              <Text style={styles.keywordVolume}>Vol: {kw.volume.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Volume</Text>
          <Text style={styles.statValue}>{selectedKeyword?.volume?.toLocaleString() || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Growth</Text>
          <View style={styles.growthContainer}>
            {isEmerging && <Text style={styles.emoji}>🚀</Text>}
            <Text style={[styles.statValue, { color: growthColor }]}>
              {isPositive ? '+' : ''}{growth}%
            </Text>
          </View>
        </View>
      </View>

      {/* Chart */}
      {chartData.length > 0 && (() => {
        // Calculate spacing to fit all points within container
        const yAxisWidth = 40;
        const containerPadding = 32; // 16px padding on each side
        const availableWidth = SCREEN_WIDTH - containerPadding - yAxisWidth - 16; // extra margin
        const numPoints = chartData.length;
        const calculatedSpacing = numPoints > 1 ? availableWidth / (numPoints - 1) : availableWidth;

        return (
          <View style={styles.chartContainer}>
            {/* Y-axis label */}
            <Text style={styles.axisLabel}>Volume</Text>
            <LineChart
              data={chartData}
              width={availableWidth}
              height={180}
              spacing={calculatedSpacing}
              initialSpacing={0}
              endSpacing={0}
              color={colors.primary}
              thickness={2}
              hideDataPoints
              curved
              areaChart
              startFillColor={colors.primary}
              endFillColor="transparent"
              startOpacity={0.3}
              endOpacity={0}
              maxValue={maxValue * 1.1}
              noOfSections={4}
              yAxisTextStyle={styles.yAxisText}
              yAxisLabelWidth={yAxisWidth}
              formatYLabel={(val) => formatVolume(Number(val))}
              xAxisLabelTexts={xAxisLabels}
              xAxisLabelTextStyle={styles.xAxisText}
              xAxisColor={colors.border}
              yAxisColor={colors.border}
              rulesType="solid"
              rulesColor="rgba(255,255,255,0.06)"
              showVerticalLines={false}
              disableScroll
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: 'rgba(233, 30, 140, 0.3)',
                pointerStripWidth: 2,
                pointerColor: colors.primary,
                radius: 6,
                pointerLabelWidth: 120,
                pointerLabelHeight: 50,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items: Array<{ value: number; label?: string }>) => {
                  const item = items[0];
                  return (
                    <View style={styles.tooltipContainer}>
                      <Text style={styles.tooltipValue}>
                        {formatVolume(item?.value || 0)}
                      </Text>
                      <Text style={styles.tooltipDate}>
                        {item?.label || ''}
                      </Text>
                    </View>
                  );
                },
              }}
            />
            {/* X-axis label */}
            <Text style={styles.axisLabelX}>Time</Text>
          </View>
        );
      })()}
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
  controls: {
    marginBottom: 12,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.mutedBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '500',
  },
  timeframeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.mutedBg,
    borderRadius: 10,
    padding: 4,
  },
  timeframeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeframeOptionActive: {
    backgroundColor: colors.card,
  },
  timeframeOptionText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  timeframeOptionTextActive: {
    color: colors.foreground,
  },
  keywordPicker: {
    maxHeight: 180,
    backgroundColor: colors.mutedBg,
    borderRadius: 10,
    marginBottom: 12,
  },
  keywordOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  keywordOptionActive: {
    backgroundColor: colors.primaryMuted,
  },
  keywordOptionText: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
  },
  keywordOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  keywordVolume: {
    fontSize: 11,
    color: colors.muted,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 14,
  },
  chartContainer: {
    marginTop: 8,
  },
  yAxisText: {
    fontSize: 10,
    color: colors.muted,
  },
  xAxisText: {
    fontSize: 10,
    color: colors.muted,
  },
  axisLabel: {
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginLeft: 40,
  },
  axisLabelX: {
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 4,
  },
  tooltipContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  tooltipDate: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
});

export default KeywordChartSection;

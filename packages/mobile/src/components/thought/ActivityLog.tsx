import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { colors, fonts } from '../../lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ThoughtEvent {
  id: string;
  eventType: string;
  metadata: any;
  createdAt: string;
}

interface ActivityLogProps {
  events: ThoughtEvent[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

function formatEventTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function getEventDescription(event: ThoughtEvent): string {
  const m = event.metadata || {};

  switch (event.eventType) {
    case 'created':
      return `📝 Captured via ${m.captureMethod || 'unknown'}`;
    case 'ai_tagged':
      return `🏷 AI auto-tagged as ${m.type || 'unknown'}`;
    case 'type_changed':
      return `🏷 Type changed: ${m.from || '?'} → ${m.to || '?'}`;
    case 'refined':
      return '✨ AI refined';
    case 'resurfaced':
      return '🔄 Resurfaced in Revisit';
    case 'resurface_action':
      return `  ↳ You ${m.action || 'acted'}`;
    case 'clustered':
      return `📁 Added to ${m.clusterName || 'cluster'}`;
    case 'unclustered':
      return `📁 Removed from ${m.clusterName || 'cluster'}`;
    case 'maturity_changed':
      return `📈 ${m.from || '?'} → ${m.to || '?'}`;
    case 'confidence_changed':
      return `🧠 Confidence: ${m.from || '?'} → ${m.to || '?'}`;
    case 'connection_found':
      return `🔗 Semantic match found: T-${m.thoughtNumber || '?'}`;
    case 'connection_added':
      return `🔗 Linked to T-${m.thoughtNumber || '?'}`;
    case 'reaction_added':
      return `👍 Reacted ${m.emoji || ''}`;
    case 'commented':
      return '💬 Comment added';
    case 'crystallized':
      return '💎 Included in crystallization';
    default:
      return `📌 ${event.eventType}`;
  }
}

function isSubEvent(eventType: string): boolean {
  return eventType === 'resurface_action';
}

export function ActivityLog({
  events,
  isLoading,
  hasMore,
  onLoadMore,
}: ActivityLogProps) {
  const [expanded, setExpanded] = useState(false);

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const displayEvents = expanded ? sortedEvents : sortedEvents.slice(0, 2);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Activity</Text>

      {isLoading && events.length === 0 ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : events.length === 0 ? (
        <Text style={styles.emptyText}>No activity yet</Text>
      ) : (
        <View style={styles.timeline}>
          {displayEvents.map((event, index) => {
            const isSub = isSubEvent(event.eventType);
            const isLast = index === displayEvents.length - 1;

            return (
              <View key={event.id} style={styles.eventRow}>
                {/* Timeline line + dot */}
                <View style={styles.timelineColumn}>
                  <View
                    style={[
                      styles.timelineDot,
                      isSub && styles.timelineDotSub,
                    ]}
                  />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* Event content */}
                <View
                  style={[
                    styles.eventContent,
                    isSub && styles.eventContentSub,
                  ]}
                >
                  <Text
                    style={[styles.eventText, isSub && styles.eventTextSub]}
                    numberOfLines={2}
                  >
                    {getEventDescription(event)}
                  </Text>
                  <Text style={styles.eventTimestamp}>
                    {formatEventTimestamp(event.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {sortedEvents.length > 2 && (
        <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
          <Text style={styles.toggleText}>
            {expanded
              ? 'Show less'
              : `Show all ${sortedEvents.length} events`}
          </Text>
        </TouchableOpacity>
      )}

      {expanded && hasMore && (
        <TouchableOpacity onPress={onLoadMore} activeOpacity={0.7}>
          <Text style={styles.loadMoreText}>Load more...</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 4,
  },
  sectionHeader: {
    color: colors.foreground,
    fontSize: 15,
    marginBottom: 12,
    ...fonts.display.semiBold,
  },
  emptyText: {
    color: colors.mutedDim,
    fontSize: 13,
    ...fonts.text.regular,
    paddingVertical: 4,
  },
  timeline: {
    paddingLeft: 4,
  },
  eventRow: {
    flexDirection: 'row',
    minHeight: 36,
  },
  timelineColumn: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.muted,
    marginTop: 4,
  },
  timelineDotSub: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mutedDim,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  eventContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    marginLeft: 8,
  },
  eventContentSub: {
    marginLeft: 12,
  },
  eventText: {
    color: colors.muted,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
    ...fonts.text.regular,
  },
  eventTextSub: {
    color: colors.mutedDim,
    fontSize: 12,
  },
  eventTimestamp: {
    color: colors.mutedDim,
    fontSize: 11,
    ...fonts.text.regular,
  },
  toggleText: {
    color: colors.brand,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
    ...fonts.text.medium,
  },
  loadMoreText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 4,
    ...fonts.text.regular,
  },
});

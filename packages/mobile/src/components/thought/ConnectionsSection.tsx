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
import { Waypoints, Zap, AlertTriangle, Link } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Connection {
  id: string;
  connectionType: string;
  strength: number;
  linkedThought: {
    id: string;
    content: string;
    thoughtType: string;
    maturityLevel: string;
    thoughtNumber: number;
    createdAt: string;
  } | null;
}

interface ConnectionsSectionProps {
  connections: Connection[];
  isLoading: boolean;
  onViewThought: (thoughtId: string) => void;
  onAddConnection: () => void;
}

const CONNECTION_TYPE_CONFIG: Record<string, { label: string; Icon: LucideIcon; color: string }> = {
  semantic: { label: 'Semantic match', Icon: Waypoints, color: '#3B82F6' },
  collision: { label: 'Collision', Icon: Zap, color: '#F59E0B' },
  contradiction: { label: 'Tension', Icon: AlertTriangle, color: '#EF4444' },
  user_linked: { label: 'You linked', Icon: Link, color: '#6B7280' },
};

function MaturityDot({ level }: { level: string }) {
  const config: Record<string, { color: string; style: 'hollow' | 'half' | 'filled' | 'ring' }> = {
    spark: { color: '#6B7280', style: 'hollow' },
    developing: { color: '#3B82F6', style: 'half' },
    hypothesis: { color: '#F59E0B', style: 'filled' },
    conviction: { color: '#10B981', style: 'ring' },
  };
  const c = config[level] || config.spark;
  if (c.style === 'hollow') {
    return <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: c.color }} />;
  }
  if (c.style === 'half') {
    return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color, opacity: 0.5 }} />;
  }
  if (c.style === 'ring') {
    return (
      <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: c.color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c.color }} />
      </View>
    );
  }
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />;
}

function formatRelativeDate(dateStr: string): string {
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

export function ConnectionsSection({
  connections,
  isLoading,
  onViewThought,
  onAddConnection,
}: ConnectionsSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const validConnections = connections.filter((c) => c.linkedThought !== null);
  const displayCount = showAll ? validConnections.length : Math.min(3, validConnections.length);
  const displayConnections = validConnections.slice(0, displayCount);
  const hasMore = validConnections.length > 3;

  const toggleShowAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAll(!showAll);
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Link size={16} color={colors.muted} />
          <Text style={styles.headerTitle}>
            {validConnections.length} Connection{validConnections.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={onAddConnection} activeOpacity={0.7}>
          <Text style={styles.addButton}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : validConnections.length === 0 ? (
        <Text style={styles.emptyText}>No connections yet</Text>
      ) : (
        <>
          {displayConnections.map((connection) => {
            const config = CONNECTION_TYPE_CONFIG[connection.connectionType] || CONNECTION_TYPE_CONFIG.semantic;
            const thought = connection.linkedThought!;
            const preview = thought.content.length > 80
              ? thought.content.slice(0, 80) + '...'
              : thought.content;
            const TypeIcon = config.Icon;

            return (
              <TouchableOpacity
                key={connection.id}
                style={styles.connectionCard}
                onPress={() => onViewThought(thought.id)}
                activeOpacity={0.7}
              >
                <View style={styles.typeBadgeRow}>
                  <View style={[styles.typeBadge, { backgroundColor: config.color + '20' }]}>
                    <TypeIcon size={12} color={config.color} />
                    <Text style={[styles.typeBadgeText, { color: config.color }]}>
                      {config.label}
                      {connection.connectionType === 'semantic'
                        ? ` (${connection.strength.toFixed(2)})`
                        : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.contentPreview} numberOfLines={2}>
                  {preview}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaLeft}>
                    <MaturityDot level={thought.maturityLevel} />
                    <Text style={styles.metaText}>
                      {thought.thoughtType} · T-{thought.thoughtNumber}
                    </Text>
                  </View>
                  <Text style={styles.metaDate}>
                    {formatRelativeDate(thought.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {hasMore && (
            <TouchableOpacity onPress={toggleShowAll} activeOpacity={0.7}>
              <Text style={styles.showAllText}>
                {showAll ? 'Show less' : `Show all ${validConnections.length}`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 15,
    ...fonts.display.semiBold,
  },
  addButton: {
    color: colors.brand,
    fontSize: 14,
    ...fonts.text.medium,
  },
  emptyText: {
    color: colors.mutedDim,
    fontSize: 13,
    ...fonts.text.regular,
    paddingVertical: 8,
  },
  connectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 12,
    ...fonts.text.medium,
  },
  contentPreview: {
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    ...fonts.text.regular,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
    ...fonts.text.regular,
  },
  metaDate: {
    color: colors.mutedDim,
    fontSize: 12,
    ...fonts.text.regular,
  },
  showAllText: {
    color: colors.brand,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
    ...fonts.text.medium,
  },
});

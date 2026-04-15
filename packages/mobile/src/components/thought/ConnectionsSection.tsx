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

const CONNECTION_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  semantic: { label: 'Semantic match', icon: '🤝', color: '#3B82F6' },
  collision: { label: 'Collision', icon: '💥', color: '#F59E0B' },
  contradiction: { label: 'Tension', icon: '⚡', color: '#EF4444' },
  user_linked: { label: 'You linked', icon: '🤝', color: '#6B7280' },
};

const MATURITY_ICONS: Record<string, string> = {
  spark: '○',
  developing: '◐',
  hypothesis: '●',
  conviction: '◉',
};

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
        <Text style={styles.headerTitle}>
          🔗 {validConnections.length} Connection{validConnections.length !== 1 ? 's' : ''}
        </Text>
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
            const maturityIcon = MATURITY_ICONS[thought.maturityLevel] || '○';
            const preview = thought.content.length > 80
              ? thought.content.slice(0, 80) + '...'
              : thought.content;

            return (
              <TouchableOpacity
                key={connection.id}
                style={styles.connectionCard}
                onPress={() => onViewThought(thought.id)}
                activeOpacity={0.7}
              >
                <View style={styles.typeBadgeRow}>
                  <View style={[styles.typeBadge, { backgroundColor: config.color + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: config.color }]}>
                      {config.icon} {config.label}
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
                  <Text style={styles.metaText}>
                    {maturityIcon} {thought.thoughtType} · T-{thought.thoughtNumber}
                  </Text>
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

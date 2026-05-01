import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../lib/theme';

type Cluster = {
  synthesis?: string | null;
  gaps?: { id: string; text: string }[] | null;
  brief?: string | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * SynthesisPanel — renders the persisted Summary, Gaps, and Brief from a
 * cluster row inline in the detail view. Sections render only when their
 * field has content. Nothing renders if all are empty.
 */
export function SynthesisPanel({ cluster }: { cluster: Cluster }) {
  const hasGaps = cluster.gaps && cluster.gaps.length > 0;
  const hasContent = !!cluster.synthesis || hasGaps || !!cluster.brief;
  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      {cluster.synthesis ? (
        <Section title="Summary">
          <Text style={styles.body}>{cluster.synthesis}</Text>
        </Section>
      ) : null}
      {hasGaps ? (
        <Section title="Gaps">
          {(cluster.gaps ?? []).map((g) => (
            <Text key={g.id} style={styles.bodyBullet}>{`• ${g.text}`}</Text>
          ))}
        </Section>
      ) : null}
      {cluster.brief ? (
        <Section title="Brief">
          <Text style={styles.body}>{cluster.brief}</Text>
        </Section>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 12, gap: 16 },
  section: { gap: 6 },
  sectionTitle: {
    ...fonts.outfit.bold,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: {
    ...fonts.outfit.regular,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
  },
  bodyBullet: {
    ...fonts.outfit.regular,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
    marginLeft: 8,
  },
});

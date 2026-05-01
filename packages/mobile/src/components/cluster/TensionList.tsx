import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { trpc } from '../../lib/trpc';

type Tension = { id: string; text: string; resolvedAt: Date | string | null };

/**
 * TensionList — renders open vs resolved tensions for a cluster.
 *
 * Open tensions are tap-to-resolve (each row calls cluster.resolveTension and
 * invalidates the cluster query so resolved ones move to the bottom group with
 * a strikethrough).
 */
export function TensionList({
  clusterId,
  tensions,
}: {
  clusterId: string;
  tensions: Tension[];
}) {
  const utils = trpc.useUtils();
  const resolveMutation = trpc.cluster.resolveTension.useMutation({
    onSuccess: () => utils.cluster.get.invalidate({ id: clusterId }),
  });

  const open = tensions.filter((t) => !t.resolvedAt);
  const resolved = tensions.filter((t) => !!t.resolvedAt);

  if (open.length === 0 && resolved.length === 0) return null;

  return (
    <View style={styles.container}>
      {open.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Tensions</Text>
          {open.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => resolveMutation.mutate({ clusterId, tensionId: t.id })}
              style={styles.openRow}
              activeOpacity={0.7}
            >
              <AlertTriangle size={16} color={colors.warning} />
              <View style={styles.textWrap}>
                <Text style={styles.text}>{t.text}</Text>
                <Text style={styles.hint}>Tap when resolved</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
      {resolved.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, styles.resolvedTitle]}>Resolved</Text>
          {resolved.map((t) => (
            <View key={t.id} style={styles.resolvedRow}>
              <CheckCircle2 size={16} color={colors.success} />
              <Text style={[styles.text, styles.resolvedText]}>{t.text}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  sectionTitle: {
    ...fonts.outfit.bold,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  resolvedTitle: { marginTop: 12 },
  openRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'flex-start' },
  resolvedRow: { flexDirection: 'row', gap: 10, paddingVertical: 6, alignItems: 'flex-start' },
  textWrap: { flex: 1 },
  text: {
    ...fonts.outfit.regular,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
  },
  hint: {
    ...fonts.outfit.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  resolvedText: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
});

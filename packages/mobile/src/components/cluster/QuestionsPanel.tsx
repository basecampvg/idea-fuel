import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { HelpCircle, ChevronRight, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors, fonts } from '../../lib/theme';
import { trpc } from '../../lib/trpc';
import { triggerHaptic } from '../ui/Button';

export type Question = {
  id: string;
  text: string;
  source: string;
  generatedAt: string;
};

/**
 * QuestionsPanel — renders 4-6 AI-generated questions whose answers (captured
 * as new thoughts) push the cluster toward a real idea.
 *
 * Tap a question  -> capture screen with the question pre-loaded as a prompt.
 * "Ask more"      -> regenerate via cluster.generateQuestions.
 *
 * The visual language matches SynthesisPanel/TensionList: muted uppercase
 * label, low-contrast chrome, no alarm colors. The point is invitation.
 */
export function QuestionsPanel({
  clusterId,
  questions,
}: {
  clusterId: string;
  questions: Question[];
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const generateMutation = trpc.cluster.generateQuestions.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.cluster.get.invalidate({ id: clusterId });
    },
    onError: () => {
      triggerHaptic('error');
    },
  });

  const handleAskMore = useCallback(() => {
    triggerHaptic('light');
    generateMutation.mutate({ id: clusterId });
  }, [clusterId, generateMutation]);

  const handleQuestionPress = useCallback(
    (q: Question) => {
      triggerHaptic('light');
      setPendingId(q.id);
      // Brief debounce so the press state has time to render before nav.
      setTimeout(() => {
        setPendingId(null);
        router.push(
          `/(tabs)/capture?prompt=${encodeURIComponent(q.text)}&clusterId=${clusterId}` as any,
        );
      }, 80);
    },
    [router, clusterId],
  );

  if (!questions || questions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Questions to grow this</Text>
      {questions.map((q) => {
        const isPressed = pendingId === q.id;
        return (
          <TouchableOpacity
            key={q.id}
            style={[styles.row, isPressed && styles.rowPressed]}
            onPress={() => handleQuestionPress(q)}
            activeOpacity={0.7}
          >
            <HelpCircle size={16} color={colors.muted} style={styles.icon} />
            <Text style={styles.text} numberOfLines={3}>
              {q.text}
            </Text>
            <ChevronRight size={16} color={colors.mutedDim} style={styles.chevron} />
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        style={styles.askMoreRow}
        onPress={handleAskMore}
        disabled={generateMutation.isPending}
        activeOpacity={0.7}
      >
        {generateMutation.isPending ? (
          <ActivityIndicator size="small" color={colors.muted} style={styles.askMoreIcon} />
        ) : (
          <Sparkles size={13} color={colors.muted} style={styles.askMoreIcon} />
        )}
        <Text style={styles.askMoreText}>
          {generateMutation.isPending ? 'Thinking…' : 'Ask more questions'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  sectionTitle: {
    ...fonts.outfit.bold,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  icon: {
    marginTop: 2,
    flexShrink: 0,
  },
  text: {
    ...fonts.outfit.regular,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
    flex: 1,
  },
  chevron: {
    marginTop: 2,
    flexShrink: 0,
  },
  askMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  askMoreIcon: {
    marginRight: 2,
  },
  askMoreText: {
    ...fonts.outfit.medium,
    fontSize: 12,
    color: colors.muted,
  },
});

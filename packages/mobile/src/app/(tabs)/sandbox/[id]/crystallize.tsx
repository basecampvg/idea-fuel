import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, X } from 'lucide-react-native';
import { trpc } from '../../../../lib/trpc';
import { colors, fonts } from '../../../../lib/theme';

type Fields = {
  title: string;
  problemStatement: string;
  targetAudience: string;
  proposedSolution: string;
  uniqueAngle: string;
  pricingHypothesis: string;
};

const FIELDS: {
  key: keyof Fields;
  label: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  { key: 'title', label: 'Title', placeholder: '3-7 words' },
  { key: 'problemStatement', label: 'Problem', placeholder: 'What problem does this solve?', multiline: true },
  { key: 'targetAudience', label: 'Audience', placeholder: 'Who experiences this problem?', multiline: true },
  { key: 'proposedSolution', label: 'Solution', placeholder: 'How does this solve it?', multiline: true },
  { key: 'uniqueAngle', label: 'Unique Angle', placeholder: 'What makes this different?', multiline: true },
  { key: 'pricingHypothesis', label: 'Pricing Hypothesis', placeholder: 'Business model hypothesis', multiline: true },
];

export default function CrystallizeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();

  const [fields, setFields] = useState<Fields | null>(null);
  const [sourceThoughtIds, setSourceThoughtIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const previewMutation = trpc.cluster.previewCrystallize.useMutation({
    onSuccess: (data) => {
      setFields({
        title: data.title,
        problemStatement: data.problemStatement,
        targetAudience: data.targetAudience,
        proposedSolution: data.proposedSolution,
        uniqueAngle: data.uniqueAngle,
        pricingHypothesis: data.pricingHypothesis,
      });
      setSourceThoughtIds(data.sourceThoughtIds);
    },
    onError: (e) => setError(e.message),
  });

  const confirmMutation = trpc.cluster.confirmCrystallize.useMutation({
    onSuccess: ({ ideaId }) => {
      // Vault still queries project.list until Phase 10 renames it
      utils.project.list.invalidate();
      utils.cluster.get.invalidate({ id });
      utils.cluster.list.invalidate();
      router.replace(`/(tabs)/vault/${ideaId}` as any);
    },
    onError: (e) => setError(e.message),
  });

  useEffect(() => {
    if (id) previewMutation.mutate({ id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleConfirm = () => {
    if (!fields || !id) return;
    setError(null);
    confirmMutation.mutate({ clusterId: id, ...fields, sourceThoughtIds });
  };

  // Loading state — initial preview hasn't returned yet
  if (previewMutation.isPending || (!fields && !error)) {
    return (
      <View style={[styles.center, { paddingBottom: insets.bottom }]}>
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.loadingText}>Crystallizing…</Text>
      </View>
    );
  }

  // Preview failed and we have nothing to render
  if (!fields) {
    return (
      <View style={[styles.center, { paddingBottom: insets.bottom }]}>
        <Text style={styles.error}>{error ?? 'Could not generate idea preview.'}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backCta}
          activeOpacity={0.8}
        >
          <Text style={styles.backCtaLabel}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <X size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crystallize</Text>
        <View style={styles.closeBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Review your idea</Text>
        <Text style={styles.subheading}>Edit any field before sending it to the Vault.</Text>

        {FIELDS.map(({ key, label, placeholder, multiline }) => (
          <View key={key} style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              value={fields[key]}
              onChangeText={(v) => setFields({ ...fields, [key]: v })}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              multiline={multiline}
              style={[styles.input, multiline && styles.inputMultiline]}
            />
          </View>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <TouchableOpacity
        onPress={handleConfirm}
        disabled={confirmMutation.isPending}
        activeOpacity={0.85}
        style={[styles.confirmBtn, { marginBottom: insets.bottom + 16 }]}
      >
        <Sparkles size={18} color="#FFF" />
        <Text style={styles.confirmLabel}>
          {confirmMutation.isPending ? 'Saving…' : 'Send to Vault'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    gap: 16,
  },
  loadingText: {
    ...fonts.outfit.medium,
    fontSize: 14,
    color: colors.muted,
    marginTop: 12,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...fonts.outfit.bold,
    fontSize: 17,
    color: colors.foreground,
  },
  scroll: { padding: 16, paddingBottom: 96 },
  heading: {
    ...fonts.outfit.bold,
    fontSize: 22,
    color: colors.foreground,
    marginBottom: 4,
  },
  subheading: {
    ...fonts.outfit.regular,
    fontSize: 14,
    color: colors.muted,
    marginBottom: 24,
  },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    ...fonts.outfit.medium,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    ...fonts.outfit.regular,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  error: {
    ...fonts.outfit.medium,
    fontSize: 13,
    color: colors.destructive,
    marginTop: 8,
    textAlign: 'center',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  confirmLabel: {
    ...fonts.outfit.bold,
    fontSize: 15,
    color: '#FFF',
  },
  backCta: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backCtaLabel: {
    ...fonts.outfit.semiBold,
    fontSize: 14,
    color: colors.foreground,
  },
});

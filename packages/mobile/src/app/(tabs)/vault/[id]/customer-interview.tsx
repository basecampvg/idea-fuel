import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Users, RefreshCw, Share2, Lock, Globe, FileText } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, triggerHaptic } from '../../../../components/ui/Button';
import { LoadingScreen } from '../../../../components/ui/Spinner';
import { trpc } from '../../../../lib/trpc';
import { colors, fonts } from '../../../../lib/theme';

type GatingOption = 'PUBLIC' | 'PASSWORD' | 'NDA';

export default function CustomerInterviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [gating, setGating] = useState<GatingOption>('PUBLIC');
  const [password, setPassword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const autoGenerateFired = useRef(false);

  const { data: ci, isLoading, refetch } = trpc.customerInterview.getByProject.useQuery(
    { projectId: id! },
    { enabled: !!id },
  );

  const generateMutation = trpc.customerInterview.generate.useMutation({
    onSuccess: () => {
      setIsGenerating(false);
      refetch();
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  const regenerateMutation = trpc.customerInterview.regenerate.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const publishMutation = trpc.customerInterview.publish.useMutation({
    onSuccess: async (data) => {
      refetch();
      const shareUrl = `https://app.ideafuel.ai/i/${data.uuid}`;
      await Share.share({
        message: `Fill out my customer interview: ${shareUrl}`,
        url: shareUrl,
      });
    },
  });

  // Auto-generate on mount if no interview exists
  useEffect(() => {
    if (!isLoading && ci === null && !autoGenerateFired.current && id) {
      autoGenerateFired.current = true;
      setIsGenerating(true);
      generateMutation.mutate({ projectId: id });
    }
  }, [isLoading, ci, id]);

  const handleRegenerate = () => {
    if (!ci) return;
    triggerHaptic('medium');
    regenerateMutation.mutate({ id: ci.id });
  };

  const handlePublish = () => {
    if (!ci) return;
    triggerHaptic('medium');
    if (gating === 'PASSWORD' && !password.trim()) return;
    publishMutation.mutate({
      id: ci.id,
      gating,
      password: gating === 'PASSWORD' ? password.trim() : undefined,
    });
  };

  const handleShare = async () => {
    if (!ci) return;
    triggerHaptic('light');
    const shareUrl = `https://app.ideafuel.ai/i/${ci.uuid}`;
    await Share.share({
      message: `Fill out my customer interview: ${shareUrl}`,
      url: shareUrl,
    });
  };

  if (isLoading || isGenerating) {
    return (
      <LoadingScreen
        message={isGenerating ? 'Generating your customer interview...' : 'Loading...'}
      />
    );
  }

  const questions = (ci?.questions as any[]) ?? [];
  const isPublished = ci?.status === 'PUBLISHED';
  const isDraft = !ci || ci.status === 'DRAFT';
  const shareUrl = ci ? `https://app.ideafuel.ai/i/${ci.uuid}` : '';

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Talk to Customers</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status badge */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, isPublished ? styles.statusPublished : styles.statusDraft]}>
            <Text style={[styles.statusText, isPublished ? styles.statusTextPublished : styles.statusTextDraft]}>
              {isPublished ? 'Published' : 'Draft'}
            </Text>
          </View>
          {isPublished && ci && (
            <Text style={styles.responseCount}>
              {ci.responseCount} {ci.responseCount === 1 ? 'response' : 'responses'}
            </Text>
          )}
        </View>

        {/* Interview title */}
        {ci?.title ? (
          <Text style={styles.interviewTitle}>{ci.title}</Text>
        ) : null}

        {/* Question preview */}
        {questions.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FileText size={16} color={colors.muted} />
              <Text style={styles.cardHeaderText}>
                {questions.length} Question{questions.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {questions.slice(0, 3).map((q: any, i: number) => (
              <View key={i} style={styles.questionRow}>
                <Text style={styles.questionNumber}>{i + 1}.</Text>
                <Text style={styles.questionText} numberOfLines={2}>
                  {q.question ?? q.text ?? String(q)}
                </Text>
              </View>
            ))}
            {questions.length > 3 && (
              <Text style={styles.moreQuestions}>+{questions.length - 3} more questions</Text>
            )}
          </View>
        )}

        {/* Gating selector — only show for drafts */}
        {isDraft && ci && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Access Control</Text>
            <View style={styles.gatingRow}>
              <TouchableOpacity
                style={[styles.gatingOption, gating === 'PUBLIC' && styles.gatingSelected]}
                onPress={() => setGating('PUBLIC')}
              >
                <Globe size={16} color={gating === 'PUBLIC' ? colors.accent : colors.muted} />
                <Text style={[styles.gatingText, gating === 'PUBLIC' && styles.gatingTextSelected]}>
                  Public
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gatingOption, gating === 'PASSWORD' && styles.gatingSelected]}
                onPress={() => setGating('PASSWORD')}
              >
                <Lock size={16} color={gating === 'PASSWORD' ? colors.accent : colors.muted} />
                <Text style={[styles.gatingText, gating === 'PASSWORD' && styles.gatingTextSelected]}>
                  Password
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gatingOption, gating === 'NDA' && styles.gatingSelected]}
                onPress={() => setGating('NDA')}
              >
                <FileText size={16} color={gating === 'NDA' ? colors.accent : colors.muted} />
                <Text style={[styles.gatingText, gating === 'NDA' && styles.gatingTextSelected]}>
                  NDA
                </Text>
              </TouchableOpacity>
            </View>

            {gating === 'PASSWORD' && (
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password..."
                placeholderTextColor={colors.mutedDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            )}
          </View>
        )}

        {/* Published share link */}
        {isPublished && (
          <View style={styles.card}>
            <Text style={styles.shareLinkLabel}>Share Link</Text>
            <Text style={styles.shareLink}>{shareUrl}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          {isPublished ? (
            <Button
              variant="primary"
              size="lg"
              onPress={handleShare}
              leftIcon={<Share2 size={18} color={colors.white} />}
              style={styles.fullWidth}
            >
              Share Interview
            </Button>
          ) : ci ? (
            <Button
              variant="primary"
              size="lg"
              onPress={handlePublish}
              leftIcon={<Users size={18} color={colors.white} />}
              style={styles.fullWidth}
              disabled={publishMutation.isPending || (gating === 'PASSWORD' && !password.trim())}
            >
              {publishMutation.isPending ? 'Publishing...' : 'Publish & Share'}
            </Button>
          ) : null}

          {isDraft && ci && (
            <Button
              variant="ghost"
              size="md"
              onPress={handleRegenerate}
              leftIcon={
                regenerateMutation.isPending
                  ? <ActivityIndicator size="small" color={colors.muted} />
                  : <RefreshCw size={16} color={colors.muted} />
              }
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate Questions'}
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusDraft: {
    backgroundColor: colors.surface,
  },
  statusPublished: {
    backgroundColor: 'rgba(3, 147, 248, 0.15)',
  },
  statusText: {
    fontSize: 13,
    ...fonts.outfit.semiBold,
  },
  statusTextDraft: {
    color: colors.muted,
  },
  statusTextPublished: {
    color: colors.accent,
  },
  responseCount: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
  },
  interviewTitle: {
    fontSize: 22,
    ...fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderText: {
    fontSize: 14,
    ...fonts.outfit.semiBold,
    color: colors.muted,
  },
  questionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  questionNumber: {
    fontSize: 14,
    ...fonts.geist.medium,
    color: colors.mutedDim,
    minWidth: 18,
  },
  questionText: {
    fontSize: 14,
    ...fonts.geist.regular,
    color: colors.foreground,
    lineHeight: 20,
    flex: 1,
  },
  moreQuestions: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.mutedDim,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    ...fonts.outfit.semiBold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gatingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gatingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  gatingSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(3, 147, 248, 0.08)',
  },
  gatingText: {
    fontSize: 13,
    ...fonts.outfit.semiBold,
    color: colors.muted,
  },
  gatingTextSelected: {
    color: colors.accent,
  },
  passwordInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    ...fonts.geist.regular,
    color: colors.foreground,
  },
  shareLinkLabel: {
    fontSize: 13,
    ...fonts.outfit.semiBold,
    color: colors.muted,
  },
  shareLink: {
    fontSize: 14,
    ...fonts.geist.regular,
    color: colors.accent,
    lineHeight: 20,
  },
  actionButtons: {
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  fullWidth: {
    width: '100%',
  },
});

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
} from 'react-native';
import { ChevronLeft, Unlock, RotateCcw } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, triggerHaptic } from '../../../../components/ui/Button';
import { ValidationCard } from '../../../../components/ui/ValidationCard';
import { LoadingScreen } from '../../../../components/ui/Spinner';
import { useToast } from '../../../../contexts/ToastContext';
import { trpc } from '../../../../lib/trpc';
import { colors, fonts } from '../../../../lib/theme';

export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  // Fetch project data to get cardResult
  const { data: project, isLoading } = trpc.project.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  // Promote mutation
  const promoteMutation = trpc.sparkCard.promote.useMutation({
    onSuccess: (data) => {
      triggerHaptic('success');
      Linking.openURL(data.webUrl);
    },
    onError: () => {
      triggerHaptic('error');
      showToast({ message: 'Failed to unlock research', type: 'error' });
    },
  });

  const handlePromote = () => {
    promoteMutation.mutate({ projectId: id! });
  };

  const handleRevalidate = () => {
    router.replace(`/(tabs)/vault/${id}/validate` as any);
  };

  if (isLoading) {
    return <LoadingScreen message="Loading your card..." />;
  }

  if (!project?.cardResult) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Validation Card</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No validation card found</Text>
          <Button variant="outline" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  // Cast cardResult from JSONB (it comes back as unknown from Drizzle)
  const cardResult = project.cardResult as any;

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
        <Text style={styles.headerTitle}>Validation Card</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Project title */}
        <Text style={styles.projectTitle}>{project.title}</Text>

        {/* Validation Card */}
        <ValidationCard cardResult={cardResult} />

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <Button
            variant="primary"
            size="lg"
            onPress={handlePromote}
            isLoading={promoteMutation.isPending}
            leftIcon={<Unlock size={18} color={colors.white} />}
            style={styles.fullWidth}
          >
            Unlock Full Research
          </Button>

          <Button
            variant="ghost"
            size="md"
            onPress={handleRevalidate}
            leftIcon={<RotateCcw size={16} color={colors.muted} />}
          >
            Re-validate
          </Button>
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
    fontFamily: fonts.outfit.semiBold,
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
  projectTitle: {
    fontSize: 22,
    fontFamily: fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  actionButtons: {
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  fullWidth: {
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
});

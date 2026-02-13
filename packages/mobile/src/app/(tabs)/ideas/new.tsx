import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../../../lib/trpc';
import { INTERVIEW_MODE_LABELS, INTERVIEW_MODE_DESCRIPTIONS, InterviewMode } from '@forge/shared';

// ideationLab Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  border: '#1F1E1C',
  borderFocus: 'rgba(233, 30, 140, 0.3)',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  destructive: '#EF4444',
  destructiveMuted: 'rgba(239, 68, 68, 0.1)',
};

const interviewModes: InterviewMode[] = ['SPARK', 'LIGHT', 'IN_DEPTH'];

const MODE_COLORS: Record<InterviewMode, { color: string; bg: string }> = {
  IN_DEPTH: { color: colors.primary, bg: colors.primaryMuted },
  LIGHT: { color: colors.accent, bg: colors.accentMuted },
  SPARK: { color: colors.warning, bg: colors.warningMuted },
};

const MODE_ICONS: Record<InterviewMode, keyof typeof Ionicons.glyphMap> = {
  IN_DEPTH: 'flame',
  LIGHT: 'flash-outline',
  SPARK: 'sparkles',
};

const MODE_DETAILS: Record<InterviewMode, { questions: string; time: string }> = {
  IN_DEPTH: { questions: '65 questions', time: '~30 min' },
  LIGHT: { questions: '10 questions', time: '~5 min' },
  SPARK: { questions: 'AI-only', time: '~1 min' },
};

export default function NewIdeaScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<InterviewMode>('LIGHT');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [titleFocused, setTitleFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);

  const startInterview = trpc.project.startInterview.useMutation();
  const startSpark = trpc.research.startSpark.useMutation();

  const createProject = trpc.project.create.useMutation({
    onSuccess: async (data) => {
      await startInterview.mutateAsync({ projectId: data.id, mode });

      if (mode === 'SPARK') {
        await startSpark.mutateAsync({ projectId: data.id });
        router.replace(`/(tabs)/ideas/${data.id}` as never);
      } else {
        router.replace(`/(tabs)/ideas/${data.id}/interview` as never);
      }
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create project: ' + error.message);
    },
  });

  const handleSubmit = () => {
    Keyboard.dismiss();
    const newErrors: { title?: string; description?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createProject.mutate({ title, description });
  };

  const isLoading = createProject.isPending || startInterview.isPending || startSpark.isPending;
  const selectedModeStyle = MODE_COLORS[mode];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Idea Title</Text>
          <TextInput
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            placeholder="e.g., AI-Powered Recipe App"
            placeholderTextColor={`${colors.muted}80`}
            returnKeyType="next"
            style={[
              styles.textInput,
              titleFocused && styles.textInputFocused,
              errors.title && styles.textInputError,
            ]}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            onFocus={() => setDescriptionFocused(true)}
            onBlur={() => setDescriptionFocused(false)}
            placeholder="Describe your business idea, the problem it solves, and your target audience..."
            placeholderTextColor={`${colors.muted}80`}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              styles.textInput,
              styles.textArea,
              descriptionFocused && styles.textInputFocused,
              errors.description && styles.textInputError,
            ]}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          <Text style={styles.charCount}>{description.length} characters</Text>
        </View>

        {/* Interview Mode Selection */}
        <View style={styles.modeSection}>
          <Text style={styles.label}>Interview Mode</Text>
          <Text style={styles.modeDescription}>
            Choose how in-depth you want the AI interview to be
          </Text>

          <View style={styles.modeList}>
            {interviewModes.map((m) => {
              const isSelected = mode === m;
              const modeStyle = MODE_COLORS[m];
              const modeIcon = MODE_ICONS[m];
              const modeDetail = MODE_DETAILS[m];

              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    Keyboard.dismiss();
                    setMode(m);
                  }}
                  style={[
                    styles.modeCard,
                    isSelected && [
                      styles.modeCardSelected,
                      { borderColor: `${modeStyle.color}50` },
                    ],
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.modeCardContent}>
                    <View
                      style={[
                        styles.modeIconContainer,
                        { backgroundColor: isSelected ? modeStyle.bg : colors.mutedBg },
                      ]}
                    >
                      <Ionicons
                        name={modeIcon}
                        size={20}
                        color={isSelected ? modeStyle.color : colors.muted}
                      />
                    </View>
                    <View style={styles.modeTextContainer}>
                      <Text
                        style={[
                          styles.modeLabel,
                          isSelected && { color: colors.foreground },
                        ]}
                      >
                        {INTERVIEW_MODE_LABELS[m]}
                      </Text>
                      <Text style={styles.modeDetails}>
                        {modeDetail.questions} • {modeDetail.time}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && { borderColor: modeStyle.color },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[styles.radioInner, { backgroundColor: modeStyle.color }]}
                        />
                      )}
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.modeSubtext,
                      isSelected && { color: colors.muted },
                    ]}
                  >
                    {INTERVIEW_MODE_DESCRIPTIONS[m]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: selectedModeStyle.color },
            isLoading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <Text style={styles.submitButtonText}>Creating...</Text>
          ) : (
            <>
              <Ionicons name={MODE_ICONS[mode]} size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {mode === 'SPARK' ? 'Create & Quick Validate' : 'Create & Start Interview'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
  },
  textInputFocused: {
    borderColor: colors.borderFocus,
  },
  textInputError: {
    borderColor: colors.destructive,
    backgroundColor: colors.destructiveMuted,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.destructive,
  },
  charCount: {
    marginTop: 6,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
  modeSection: {
    marginBottom: 20,
  },
  modeDescription: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 16,
  },
  modeList: {
    gap: 12,
  },
  modeCard: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  modeCardSelected: {
    backgroundColor: colors.mutedBg,
  },
  modeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 2,
  },
  modeDetails: {
    fontSize: 12,
    color: colors.muted,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modeSubtext: {
    fontSize: 13,
    color: `${colors.muted}99`,
    lineHeight: 18,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

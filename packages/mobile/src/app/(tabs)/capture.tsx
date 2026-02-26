import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '../../components/ui/Button';
import { trpc } from '../../lib/trpc';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { RecentDrafts } from '../../components/RecentDrafts';

const PROJECT_TITLE_MAX = 80;

const colors = {
  background: '#11100E',
  card: '#1A1918',
  border: '#1F1E1C',
  borderFocus: '#E91E8C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedDim: '#5A5855',
  primary: '#E91E8C',
};

function extractTitleAndDescription(text: string): { title: string; description: string } {
  const lines = text.split('\n');
  const title = lines[0].trim().slice(0, PROJECT_TITLE_MAX);
  const description = lines.slice(1).join('\n').trim();
  return { title, description };
}

export default function CaptureScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ideaText, setIdeaText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();
  const createProject = trpc.project.create.useMutation({
    onSuccess: (data: { id: string; title: string }) => {
      setIsSubmitting(false);
      triggerHaptic('success');
      showToast({
        message: 'Idea captured',
        projectTitle: data.title,
        projectId: data.id,
        type: 'success',
      });
      setIdeaText('');
      utils.project.list.invalidate();
      // Re-focus the input for the next idea
      setTimeout(() => inputRef.current?.focus(), 300);
    },
    onError: () => {
      setIsSubmitting(false);
      triggerHaptic('error');
      showToast({
        message: 'Failed to save — tap to retry',
        type: 'error',
      });
    },
  });

  const handleCapture = useCallback(() => {
    const trimmed = ideaText.trim();
    if (!trimmed || isSubmitting) return;

    const { title, description } = extractTitleAndDescription(trimmed);
    if (!title) return;

    setIsSubmitting(true);
    createProject.mutate({ title, description: description || title });
  }, [ideaText, isSubmitting, createProject]);

  // Auto-save on 2s idle (only when input has content and is blurred)
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const trimmed = ideaText.trim();
    if (!trimmed) return;

    autoSaveTimer.current = setTimeout(() => {
      handleCapture();
    }, 2000);
  }, [ideaText, handleCapture]);

  // Cancel auto-save timer when text changes (resets the 2s clock)
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [ideaText]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // When blurring with content, trigger auto-save
    if (ideaText.trim()) {
      scheduleAutoSave();
    }
  }, [ideaText, scheduleAutoSave]);

  const { title } = extractTitleAndDescription(ideaText.trim());
  const canCapture = title.length > 0 && !isSubmitting;

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.greeting}>Hey {firstName}</Text>
              <Text style={styles.prompt}>What's your idea?</Text>
            </View>

            {/* Input Card */}
            <View style={[
              styles.inputCard,
              isFocused && styles.inputCardFocused,
            ]}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={ideaText}
                onChangeText={setIdeaText}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                placeholder="Type your idea here..."
                placeholderTextColor={colors.mutedDim}
                multiline
                autoFocus
                textAlignVertical="top"
                returnKeyType="default"
              />
              {ideaText.length > 0 && ideaText.trim().length < 10 && (
                <Text style={styles.charHint}>
                  {10 - ideaText.trim().length} more characters
                </Text>
              )}
            </View>

            {/* Recent Drafts */}
            <RecentDrafts />
          </View>

          {/* Bottom Capture Button */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.captureButton, !canCapture && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={!canCapture}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="#FFFFFF" />
                  <Text style={styles.captureButtonText}>Capture</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: '500',
    marginBottom: 4,
  },
  prompt: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  inputCard: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 140,
  },
  inputCardFocused: {
    borderColor: colors.borderFocus,
  },
  textInput: {
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 24,
    minHeight: 100,
    padding: 0,
  },
  charHint: {
    fontSize: 12,
    color: colors.mutedDim,
    marginTop: 8,
    textAlign: 'right',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 8,
  },
  captureButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  captureButtonDisabled: {
    opacity: 0.4,
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

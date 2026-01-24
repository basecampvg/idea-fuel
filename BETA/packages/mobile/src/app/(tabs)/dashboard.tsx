import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../contexts/AuthContext';
import { PromptHintSheet } from '../../components/PromptHintSheet';

// Forge Design System Colors - inline for reliability
const colors = {
  background: '#11100E',
  card: '#1A1918',
  cardHover: '#222120',
  border: '#2A2928',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedDark: '#5A5855',
  primary: '#E91E8C',
  accent: '#14B8A6',
  secondary: '#8B5CF6',
  warning: '#F59E0B',
  blue: '#3B82F6',
  green: '#22C55E',
};

type InterviewMode = 'SPARK' | 'LIGHT' | 'IN_DEPTH' | 'SAVE';

interface ModeOption {
  id: InterviewMode;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  color: string;
}

const modeOptions: ModeOption[] = [
  {
    id: 'IN_DEPTH',
    icon: 'flame',
    label: 'Forge',
    description: 'Deep dive interview',
    color: colors.primary,
  },
  {
    id: 'LIGHT',
    icon: 'flash-outline',
    label: 'Light',
    description: 'Quick interview',
    color: colors.blue,
  },
  {
    id: 'SPARK',
    icon: 'sparkles',
    label: 'Spark',
    description: 'Instant validation',
    color: colors.warning,
  },
  {
    id: 'SAVE',
    icon: 'bookmark-outline',
    label: 'Save',
    description: 'Save for later',
    color: colors.green,
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [ideaDescription, setIdeaDescription] = useState('');
  const [selectedMode, setSelectedMode] = useState<InterviewMode>('IN_DEPTH');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPromptHint, setShowPromptHint] = useState(false);
  const [shouldShowHintOnFocus, setShouldShowHintOnFocus] = useState(false);

  const HINT_STORAGE_KEY = 'forge_prompt_hint_views';

  // Check if we should show hint on focus (first 5 visits)
  useEffect(() => {
    const checkHintViews = async () => {
      try {
        const viewCountStr = await AsyncStorage.getItem(HINT_STORAGE_KEY);
        const viewCount = parseInt(viewCountStr || '0', 10);

        if (viewCount < 5) {
          setShouldShowHintOnFocus(true);
        }
      } catch (error) {
        console.error('Failed to check hint views:', error);
      }
    };

    checkHintViews();
  }, []);

  // Show hint and increment counter when input is focused
  const handleInputFocus = async () => {
    setIsFocused(true);

    if (shouldShowHintOnFocus && !showPromptHint) {
      try {
        const viewCountStr = await AsyncStorage.getItem(HINT_STORAGE_KEY);
        const viewCount = parseInt(viewCountStr || '0', 10);

        if (viewCount < 5) {
          setShowPromptHint(true);
          await AsyncStorage.setItem(HINT_STORAGE_KEY, String(viewCount + 1));

          // Stop showing after 5 times
          if (viewCount + 1 >= 5) {
            setShouldShowHintOnFocus(false);
          }
        } else {
          setShouldShowHintOnFocus(false);
        }
      } catch (error) {
        console.error('Failed to update hint views:', error);
      }
    }
  };

  const createIdea = trpc.idea.create.useMutation();
  const startInterview = trpc.idea.startInterview.useMutation();
  const startSpark = trpc.research.startSpark.useMutation();

  const firstName = user?.name?.split(' ')[0] || 'there';
  const canSubmit = ideaDescription.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      const title = ideaDescription.split('\n')[0].slice(0, 100) || 'Untitled Idea';

      const idea = await createIdea.mutateAsync({
        title,
        description: ideaDescription,
      });

      if (selectedMode === 'SAVE') {
        router.push(`/ideas/${idea.id}`);
      } else if (selectedMode === 'SPARK') {
        await startInterview.mutateAsync({ ideaId: idea.id, mode: 'SPARK' });
        await startSpark.mutateAsync({ ideaId: idea.id });
        router.push(`/ideas/${idea.id}`);
      } else {
        // LIGHT or IN_DEPTH - go to interview
        await startInterview.mutateAsync({
          ideaId: idea.id,
          mode: selectedMode as 'LIGHT' | 'IN_DEPTH',
        });
        router.push(`/ideas/${idea.id}/interview`);
      }

      setIdeaDescription('');
    } catch (error) {
      console.error('Failed to create idea:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.mainContent}>
          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingLabel}>Welcome back, {firstName}</Text>
            <Text style={styles.greetingTitle}>What's your next idea?</Text>
          </View>

          {/* Idea Input Card - Expanded */}
          <View style={[styles.inputCard, isFocused && styles.inputCardFocused]}>
            {/* Help Icon */}
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowPromptHint(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              value={ideaDescription}
              onChangeText={setIdeaDescription}
              onFocus={handleInputFocus}
              onBlur={() => setIsFocused(false)}
              placeholder="Describe your business idea..."
              placeholderTextColor={colors.mutedDark}
              style={styles.textInput}
              multiline
              textAlignVertical="top"
              editable={!isSubmitting}
            />

            {/* Character hint */}
            {ideaDescription.length > 0 && ideaDescription.length < 10 && (
              <Text style={styles.charHint}>
                {10 - ideaDescription.length} more characters needed
              </Text>
            )}
          </View>
        </View>
        </TouchableWithoutFeedback>

        {/* Bottom Section - Mode Selector + Submit */}
        <View style={styles.bottomSection}>
          {/* Mode Selector */}
          <View style={styles.modeGrid}>
            {modeOptions.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  onPress={() => setSelectedMode(mode.id)}
                  style={[
                    styles.modeCard,
                    isSelected && { borderColor: mode.color, backgroundColor: mode.color + '15' },
                  ]}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.modeIconContainer,
                      { backgroundColor: isSelected ? mode.color + '20' : colors.card },
                    ]}
                  >
                    <Ionicons
                      name={mode.icon}
                      size={20}
                      color={isSelected ? mode.color : colors.muted}
                    />
                  </View>
                  <Text
                    style={[
                      styles.modeLabel,
                      isSelected && { color: mode.color },
                    ]}
                  >
                    {mode.label}
                  </Text>
                  <Text style={styles.modeDescription} numberOfLines={1}>
                    {mode.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            style={[
              styles.submitButton,
              canSubmit && !isSubmitting
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
            ]}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <Ionicons name="hourglass" size={20} color="#FFF" />
            ) : (
              <>
                <Text
                  style={[
                    styles.submitButtonText,
                    !canSubmit && { color: colors.muted },
                  ]}
                >
                  {selectedMode === 'SAVE' ? 'Save Idea' : `Start ${modeOptions.find(m => m.id === selectedMode)?.label}`}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={canSubmit ? '#FFF' : colors.muted}
                  style={{ marginLeft: 8 }}
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Prompt Hint Bottom Sheet */}
      <PromptHintSheet
        visible={showPromptHint}
        onClose={() => setShowPromptHint(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  // Main content area (greeting + input)
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Greeting
  greetingContainer: {
    marginBottom: 24,
  },
  greetingLabel: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.5,
  },

  // Input Card - Expanded to fill space
  inputCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    position: 'relative',
  },
  inputCardFocused: {
    borderColor: colors.primary + '60',
  },
  helpButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  textInput: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 44, // Extra padding for help button
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 16,
    color: colors.foreground,
    minHeight: 200,
  },
  charHint: {
    fontSize: 12,
    color: colors.muted,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  // Bottom Section - Fixed at bottom
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },

  // Mode Selector
  modeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  modeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  modeDescription: {
    fontSize: 9,
    color: colors.muted,
    textAlign: 'center',
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { triggerHaptic } from '../../components/ui/Button';
import { trpc } from '../../lib/trpc';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { RecentDrafts } from '../../components/RecentDrafts';
import { colors } from '../../lib/theme';

const PROJECT_TITLE_MAX = 80;

type CaptureMode = 'voice' | 'text';

function extractTitleAndDescription(text: string): { title: string; description: string } {
  const lines = text.split('\n');
  const title = lines[0].trim().slice(0, PROJECT_TITLE_MAX);
  const description = lines.slice(1).join('\n').trim();
  return { title, description };
}

export default function CaptureScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<CaptureMode>('voice');
  const [ideaText, setIdeaText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pulse animation for record button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.6,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.4,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0);
    }
  }, [isListening, pulseAnim, pulseOpacity]);

  // Speech recognition events
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript || '';
    if (transcript) {
      setIdeaText((prev) => {
        // If this is a final result, append. If partial, replace last segment.
        if (event.isFinal) {
          return prev ? `${prev} ${transcript}` : transcript;
        }
        // For partial results, show what we have so far
        const lines = prev.split('\n');
        // Replace the last partial line
        if (lines.length > 0 && !prev.endsWith('\n')) {
          return transcript;
        }
        return transcript;
      });
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    if (event.error !== 'no-speech') {
      showToast({
        message: 'Voice recognition error',
        type: 'error',
      });
    }
  });

  const toggleListening = useCallback(async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      triggerHaptic('light');
      return;
    }

    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        showToast({ message: 'Microphone permission required', type: 'error' });
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
      });
      setIsListening(true);
      triggerHaptic('medium');
    } catch (err) {
      showToast({
        message: 'Voice dictation not available — use text mode',
        type: 'error',
      });
      setMode('text');
    }
  }, [isListening, showToast]);

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

    // Stop listening if active
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    }

    setIsSubmitting(true);
    createProject.mutate({ title, description: description || title });
  }, [ideaText, isSubmitting, isListening, createProject]);

  // Auto-save on 2s idle when blurred
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const trimmed = ideaText.trim();
    if (!trimmed) return;

    autoSaveTimer.current = setTimeout(() => {
      handleCapture();
    }, 2000);
  }, [ideaText, handleCapture]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [ideaText]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (ideaText.trim()) {
      scheduleAutoSave();
    }
  }, [ideaText, scheduleAutoSave]);

  const { title } = extractTitleAndDescription(ideaText.trim());
  const canCapture = title.length > 0 && !isSubmitting;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header: IDEA FUEL wordmark */}
          <View style={styles.headerBar}>
            <Text style={styles.wordmarkIdea}>IDEA </Text>
            <Text style={styles.wordmarkFuel}>FUEL</Text>
          </View>

          {mode === 'voice' ? (
            <View style={styles.voiceContainer}>
              {/* Flame icon */}
              <View style={styles.flameContainer}>
                <Ionicons name="flame" size={120} color={colors.brand} />
              </View>

              {/* Tagline */}
              <Text style={styles.tagline}>
                DON'T LET YOUR IDEAS{' '}
                <Text style={{ color: colors.brand }}>DIE</Text>
              </Text>

              {/* Transcription display */}
              {ideaText.length > 0 && (
                <View style={styles.transcriptBox}>
                  <Text style={styles.transcriptText} numberOfLines={4}>
                    {ideaText}
                  </Text>
                </View>
              )}

              {/* Soundwave placeholder (animated bars) */}
              <View style={styles.soundwaveContainer}>
                {isListening && (
                  <View style={styles.soundwaveBars}>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <SoundBar key={i} index={i} active={isListening} />
                    ))}
                  </View>
                )}
              </View>

              {/* Record button with pulse rings */}
              <View style={styles.recordButtonWrapper}>
                {/* Pulse ring */}
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseOpacity,
                    },
                  ]}
                />
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    isListening && styles.recordButtonActive,
                  ]}
                  onPress={toggleListening}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isListening ? 'stop' : 'mic'}
                    size={28}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              {/* Status label */}
              <Text style={styles.statusLabel}>
                {isListening ? 'listening...' : 'tap to speak'}
              </Text>

              {/* Capture button (appears when there's text) */}
              {canCapture && !isListening && (
                <TouchableOpacity
                  style={styles.captureButtonSmall}
                  onPress={handleCapture}
                  activeOpacity={0.7}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.captureButtonSmallText}>Save Idea</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* ─── Text Mode ─── */
            <View style={styles.textContainer}>
              <View style={styles.textHeader}>
                <Text style={styles.greeting}>
                  Hey {user?.name?.split(' ')[0] || 'there'}
                </Text>
                <Text style={styles.prompt}>What's your idea?</Text>
              </View>

              <View
                style={[
                  styles.inputCard,
                  isFocused && styles.inputCardFocused,
                ]}
              >
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
              </View>

              <RecentDrafts />

              {/* Capture button */}
              <View style={styles.textBottomSection}>
                <TouchableOpacity
                  style={[
                    styles.captureButton,
                    !canCapture && styles.captureButtonDisabled,
                  ]}
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
            </View>
          )}

          {/* Mode toggle (always visible at bottom) */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[
                styles.modeToggleButton,
                mode === 'voice' && styles.modeToggleActive,
              ]}
              onPress={() => {
                if (isListening) {
                  ExpoSpeechRecognitionModule.stop();
                  setIsListening(false);
                }
                setMode('voice');
              }}
            >
              <Ionicons
                name="mic"
                size={16}
                color={mode === 'voice' ? colors.brand : colors.mutedDim}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  mode === 'voice' && styles.modeToggleTextActive,
                ]}
              >
                Voice
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeToggleButton,
                mode === 'text' && styles.modeToggleActive,
              ]}
              onPress={() => {
                if (isListening) {
                  ExpoSpeechRecognitionModule.stop();
                  setIsListening(false);
                }
                setMode('text');
              }}
            >
              <Ionicons
                name="create"
                size={16}
                color={mode === 'text' ? colors.brand : colors.mutedDim}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  mode === 'text' && styles.modeToggleTextActive,
                ]}
              >
                Text
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

/** Animated sound bar for the waveform visualization */
function SoundBar({ index, active }: { index: number; active: boolean }) {
  const height = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (active) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(height, {
            toValue: 8 + Math.random() * 32,
            duration: 200 + Math.random() * 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(height, {
            toValue: 4 + Math.random() * 12,
            duration: 200 + Math.random() * 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      // Stagger start
      const timer = setTimeout(() => animation.start(), index * 40);
      return () => {
        clearTimeout(timer);
        animation.stop();
      };
    } else {
      Animated.timing(height, {
        toValue: 8,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [active, height, index]);

  return (
    <Animated.View
      style={{
        width: 3,
        height,
        borderRadius: 1.5,
        backgroundColor: colors.brand,
        opacity: 0.6,
      }}
    />
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

  // ── Header ──
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  wordmarkIdea: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 4,
    color: '#BCBCBC',
  },
  wordmarkFuel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 4,
    color: colors.brand,
  },

  // ── Voice Mode ──
  voiceContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  flameContainer: {
    marginBottom: 8,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 3,
    color: '#BCBCBC',
    textAlign: 'center',
    marginBottom: 24,
  },
  transcriptBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    maxWidth: '100%',
    width: '100%',
  },
  transcriptText: {
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 22,
    textAlign: 'center',
  },
  soundwaveContainer: {
    height: 50,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  soundwaveBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 50,
  },
  recordButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  recordButtonActive: {
    backgroundColor: '#C82617',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: colors.mutedDim,
    textTransform: 'lowercase',
    marginTop: 8,
    marginBottom: 16,
  },
  captureButtonSmall: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 8,
  },
  captureButtonSmallText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Text Mode ──
  textContainer: {
    flex: 1,
    paddingTop: 8,
  },
  textHeader: {
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
    borderColor: `${colors.brand}50`,
  },
  textInput: {
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 24,
    minHeight: 100,
    padding: 0,
  },
  textBottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 8,
  },
  captureButton: {
    backgroundColor: colors.brand,
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

  // ── Mode Toggle ──
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  modeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  modeToggleActive: {
    backgroundColor: `${colors.brand}15`,
    borderWidth: 1,
    borderColor: `${colors.brand}30`,
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.mutedDim,
  },
  modeToggleTextActive: {
    color: colors.brand,
  },
});

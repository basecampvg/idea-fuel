import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Pressable,
  Keyboard,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Mic, Square, Zap, PenLine } from 'lucide-react-native';
import { triggerHaptic } from '../../components/ui/Button';
import { trpc } from '../../lib/trpc';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { IdeaFuelLogo } from '../../components/IdeaFuelLogo';
import { SloganSVG } from '../../components/SloganSVG';
import { colors } from '../../lib/theme';

// expo-speech-recognition requires a dev build — safely handle Expo Go
let SpeechModule: any = null;
let useSpeechEvent: any = () => {};
try {
  const mod = require('expo-speech-recognition');
  SpeechModule = mod.SpeechModule;
  useSpeechEvent = mod.useSpeechEvent;
} catch {
  // Not available in Expo Go — voice mode will fall back to text
}

const PROJECT_TITLE_MAX = 80;

type CaptureMode = 'voice' | 'text';

function extractTitleAndDescription(text: string): { title: string; description: string } {
  const lines = text.split('\n');
  const title = lines[0].trim().slice(0, PROJECT_TITLE_MAX);
  const description = lines.slice(1).join('\n').trim();
  return { title, description };
}

function ModeTogglePill({ label, icon, isActive, onPress }: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 10,
          borderRadius: 12,
        },
        isActive
          ? { backgroundColor: '#8B2418', borderWidth: 2, borderColor: '#E32B1A' }
          : { backgroundColor: '#1E1D1B', borderWidth: 1, borderColor: '#2A2A2A' },
      ]}
    >
      {icon}
      <Text style={{ fontSize: 14, fontWeight: '600', color: isActive ? '#FFFFFF' : '#8A8680' }}>
        {label}
      </Text>
    </Pressable>
  );
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
  useSpeechEvent('result', (event: any) => {
    const transcript = event.results[0]?.transcript || '';
    if (transcript) {
      setIdeaText((prev) => {
        if (event.isFinal) {
          return prev ? `${prev} ${transcript}` : transcript;
        }
        const lines = prev.split('\n');
        if (lines.length > 0 && !prev.endsWith('\n')) {
          return transcript;
        }
        return transcript;
      });
    }
  });

  useSpeechEvent('end', () => {
    setIsListening(false);
  });

  useSpeechEvent('error', (event: any) => {
    setIsListening(false);
    if (event.error !== 'no-speech') {
      showToast({
        message: 'Voice recognition error',
        type: 'error',
      });
    }
  });

  const toggleListening = useCallback(async () => {
    if (!SpeechModule) {
      showToast({
        message: 'Voice dictation requires a dev build — switching to text',
        type: 'info',
      });
      setMode('text');
      return;
    }

    if (isListening) {
      SpeechModule.stop();
      setIsListening(false);
      triggerHaptic('light');
      return;
    }

    try {
      const result = await SpeechModule.requestPermissionsAsync();
      if (!result.granted) {
        showToast({ message: 'Microphone permission required', type: 'error' });
        return;
      }

      SpeechModule.start({
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

    if (isListening) {
      SpeechModule.stop();
      setIsListening(false);
    }

    setIsSubmitting(true);
    createProject.mutate({ title, description: description || title });
  }, [ideaText, isSubmitting, isListening, createProject]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const { title } = extractTitleAndDescription(ideaText.trim());
  const canCapture = title.length > 0 && !isSubmitting;

  return (
    <View style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {mode === 'voice' ? (
            <View style={styles.voiceContainer}>
              {/* ── Top section: logo + slogan (centered in upper half) ── */}
              <View style={styles.voiceTopSpacer} />
              <View style={styles.voiceTopSection}>
                <View style={styles.flameContainer}>
                  <IdeaFuelLogo size={120} />
                </View>
                <SloganSVG width={260} />
              </View>

              {/* ── Middle section: transcript + soundwave ── */}
              <View style={styles.voiceMiddleSection}>
                {ideaText.length > 0 && (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptText} numberOfLines={4}>
                      {ideaText}
                    </Text>
                  </View>
                )}

                <View style={styles.soundwaveContainer}>
                  {isListening && (
                    <View style={styles.soundwaveBars}>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SoundBar key={i} index={i} active={isListening} />
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* ── Bottom section: record button + save + status ── */}
              <View style={styles.voiceBottomSection}>
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

                <View style={styles.recordButtonWrapper}>
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
                    {isListening ? (
                      <Square size={22} color="#fff" fill="#fff" />
                    ) : (
                      <Mic size={26} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.statusLabel}>
                  {isListening ? 'listening...' : 'tap to speak'}
                </Text>
              </View>
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
                      <Zap size={18} color="#FFFFFF" />
                      <Text style={styles.captureButtonText}>Capture</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Mode toggle (always visible at bottom) */}
          <View style={styles.modeToggle}>
            <ModeTogglePill
              label="Voice"
              icon={<Mic size={18} color={mode === 'voice' ? '#FFFFFF' : colors.muted} />}
              isActive={mode === 'voice'}
              onPress={() => {
                if (isListening) {
                  SpeechModule.stop();
                  setIsListening(false);
                }
                setMode('voice');
              }}
            />
            <ModeTogglePill
              label="Text"
              icon={<PenLine size={18} color={mode === 'text' ? '#FFFFFF' : colors.muted} />}
              isActive={mode === 'text'}
              onPress={() => {
                if (isListening) {
                  SpeechModule.stop();
                  setIsListening(false);
                }
                setMode('text');
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
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
    paddingHorizontal: 24,
  },
  voiceTopSpacer: {
    flex: 0.6,
  },
  voiceTopSection: {
    alignItems: 'center',
    gap: 24,
  },
  flameContainer: {
    marginBottom: 0,
  },
  voiceMiddleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcriptBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
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
  },
  soundwaveBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 50,
  },
  voiceBottomSection: {
    alignItems: 'center',
    paddingBottom: 48,
    gap: 8,
  },
  recordButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.brand,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  },
  captureButtonSmall: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
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
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeToggleActive: {
    backgroundColor: '#8B2418',
    borderColor: colors.brand,
    borderWidth: 2,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
  },
});

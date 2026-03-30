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
  InteractionManager,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Mic, Square, ArrowUp, Paperclip } from 'lucide-react-native';
import { AttachmentPopover } from '../../components/AttachmentPopover';
import { ThumbnailStrip, type LocalAttachment } from '../../components/ThumbnailStrip';
import { triggerHaptic } from '../../components/ui/Button';
import { trpc } from '../../lib/trpc';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { IdeaFuelLogo } from '../../components/IdeaFuelLogo';
import { SloganSVG } from '../../components/SloganSVG';
import { OrbAnimation, type OrbState } from '../../components/OrbAnimation';
import { colors, fonts } from '../../lib/theme';

// Defer loading expo-speech-recognition until after the initial Fabric mount
// transaction completes. Loading it eagerly at module level triggers TurboModule
// void method invocations during the splash→tabs navigation, which races with
// Fabric's view hierarchy updates and causes SIGABRT under New Architecture.
let _speechModuleResolved = false;
let SpeechModule: any = null;
let _useSpeechEvent: any = null;

function loadSpeechModule(): boolean {
  if (_speechModuleResolved) return SpeechModule !== null && typeof _useSpeechEvent === 'function';
  _speechModuleResolved = true;
  try {
    const mod = require('expo-speech-recognition');
    SpeechModule = mod.ExpoSpeechRecognitionModule ?? null;
    _useSpeechEvent = typeof mod.useSpeechRecognitionEvent === 'function' ? mod.useSpeechRecognitionEvent : null;
    return SpeechModule !== null && _useSpeechEvent !== null;
  } catch {
    return false;
  }
}

const PROJECT_TITLE_MAX = 80;

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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [showPopover, setShowPopover] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [popoverAnchorY, setPopoverAnchorY] = useState(0);
  const inputBarRef = useRef<View>(null);

  const MAX_ATTACHMENTS = 5;

  // Orb state: idle → listening (mic on, waiting) → talking (speech detected)
  const orbState: OrbState = isListening ? (isSpeaking ? 'talking' : 'listening') : null;

  const showLogo = !inputFocused && ideaText.length === 0 && !isListening;

  // Pulse animation for mic button when listening
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.8,
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

  // Track finalized speech text separately so interim results don't overwrite it
  const finalizedText = useRef('');

  // Defer loading the speech native module until after the initial navigation
  // animation completes, avoiding TurboModule calls during Fabric mount.
  const [speechReady, setSpeechReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      if (loadSpeechModule()) {
        setSpeechReady(true);
      }
    });
    return () => handle.cancel();
  }, []);

  const handleOpenPopover = useCallback(() => {
    inputBarRef.current?.measureInWindow((_x, y, _w, _h) => {
      setPopoverAnchorY(y > 0 ? y : 200);
      setShowPopover(true);
    });
  }, []);

  const processPickerResult = useCallback((result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets) return;

    const remaining = MAX_ATTACHMENTS - attachments.length;
    const newImages = result.assets.slice(0, remaining).map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName || `image-${Date.now()}.jpg`,
      mimeType: (asset.mimeType || 'image/jpeg') as string,
      sizeBytes: asset.fileSize || 0,
    }));

    setAttachments((prev) => [...prev, ...newImages]);
  }, [attachments.length]);

  const handleCamera = useCallback(async () => {
    setShowPopover(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Camera permission required', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    processPickerResult(result);
  }, [showToast, processPickerResult]);

  const handlePhotos = useCallback(async () => {
    setShowPopover(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Photo library permission required', type: 'error' });
      return;
    }
    const remaining = MAX_ATTACHMENTS - attachments.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    processPickerResult(result);
  }, [showToast, attachments.length, processPickerResult]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleListening = useCallback(async () => {
    if (!SpeechModule) {
      showToast({
        message: 'Voice dictation not available',
        type: 'info',
      });
      return;
    }

    if (isListening) {
      SpeechModule.stop();
      setIsListening(false);
      setIsSpeaking(false);
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
        message: 'Voice dictation not available',
        type: 'error',
      });
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
      finalizedText.current = '';
      setAttachments([]);
      setAiConsent(false);
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

  const getUploadUrl = trpc.attachment.getUploadUrl.useMutation();

  const handleCapture = useCallback(async () => {
    const trimmed = ideaText.trim();
    if (!trimmed || isSubmitting) return;

    const { title, description } = extractTitleAndDescription(trimmed);
    if (!title) return;

    if (isListening) {
      SpeechModule?.stop();
      setIsListening(false);
      setIsSpeaking(false);
    }

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      // Upload attachments first
      const attachmentMetadata: Array<{
        storagePath: string;
        fileName: string;
        mimeType: 'image/jpeg' | 'image/png' | 'image/heic';
        sizeBytes: number;
        order: number;
      }> = [];

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          fileName: att.fileName,
          mimeType: att.mimeType as 'image/jpeg' | 'image/png' | 'image/heic',
        });

        // Upload directly to Supabase Storage
        const response = await fetch(att.uri);
        const blob = await response.blob();

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': att.mimeType,
          },
          body: blob,
        });

        if (!uploadResponse.ok) {
          showToast({ message: `Failed to upload image ${i + 1}`, type: 'error' });
          continue;
        }

        attachmentMetadata.push({
          storagePath,
          fileName: att.fileName,
          mimeType: att.mimeType as 'image/jpeg' | 'image/png' | 'image/heic',
          sizeBytes: att.sizeBytes,
          order: i,
        });
      }

      createProject.mutate({
        title,
        description: description || title,
        attachments: attachmentMetadata.length > 0 ? attachmentMetadata : undefined,
        aiConsentForImages: attachmentMetadata.length > 0 ? aiConsent : false,
      });
    } catch {
      setIsSubmitting(false);
      triggerHaptic('error');
      showToast({ message: 'Failed to upload images', type: 'error' });
    }
  }, [ideaText, isSubmitting, isListening, createProject, attachments, aiConsent, getUploadUrl, showToast]);

  const { title } = extractTitleAndDescription(ideaText.trim());
  const canCapture = title.length > 0 && !isSubmitting;

  return (
    <View style={styles.safeArea}>
      {speechReady && (
        <SpeechListeners
          finalizedText={finalizedText}
          setIdeaText={setIdeaText}
          setIsListening={setIsListening}
          setIsSpeaking={setIsSpeaking}
          showToast={showToast}
        />
      )}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          {/* ── Center: Logo + Slogan / Orb when listening ── */}
          <View style={styles.centerSection}>
            {/* Orb — only mounted when listening */}
            {isListening && (
              <View style={styles.orbContainer}>
                <OrbAnimation state={orbState} />
              </View>
            )}

            {showLogo && (
              <View style={styles.logoArea}>
                <IdeaFuelLogo size={120} />
                <View style={{ marginTop: 24 }}>
                  <SloganSVG width={260} />
                </View>
              </View>
            )}

          </View>

          {/* ── Bottom: Input bar ── */}
          <View style={styles.inputBarWrapper}>
            <View ref={inputBarRef} style={[
              styles.inputBar,
              (inputFocused || isListening) && styles.inputBarActive,
            ]}>
              {/* Orange glow on the top stroke */}
              <LinearGradient
                colors={['transparent', colors.brand, 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.inputBarTopGlow}
              />

              {/* Row 1: Text input */}
              <TextInput
                ref={inputRef}
                style={styles.inputField}
                value={ideaText}
                onChangeText={setIdeaText}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Capture your idea..."
                placeholderTextColor={colors.mutedDim}
                multiline
                maxLength={500}
              />

              {/* Thumbnail strip */}
              <ThumbnailStrip
                attachments={attachments}
                onRemove={handleRemoveAttachment}
              />

              {/* AI consent toggle */}
              {attachments.length > 0 && (
                <View style={styles.consentRow}>
                  <Text style={styles.consentLabel}>Let AI analyze your images</Text>
                  <Switch
                    value={aiConsent}
                    onValueChange={setAiConsent}
                    trackColor={{ false: colors.surface, true: colors.brandMuted }}
                    thumbColor={aiConsent ? colors.brand : colors.muted}
                  />
                </View>
              )}

              {/* Row 2: Action buttons */}
              <View style={styles.inputActionsRow}>
                {/* Left: Paperclip */}
                <View style={styles.inputActionsLeft}>
                  <TouchableOpacity
                    style={styles.paperclipButton}
                    onPress={handleOpenPopover}
                    activeOpacity={0.7}
                    disabled={attachments.length >= MAX_ATTACHMENTS}
                  >
                    <Paperclip size={18} color={attachments.length >= MAX_ATTACHMENTS ? colors.mutedDim : colors.muted} />
                  </TouchableOpacity>
                </View>

                {/* Right: Mic + Send */}
                <View style={styles.inputActionsRight}>
                  {canCapture && (
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={handleCapture}
                      activeOpacity={0.7}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <ArrowUp size={18} color="#fff" strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.micButton,
                      isListening && styles.micButtonActive,
                    ]}
                    onPress={toggleListening}
                    activeOpacity={0.7}
                  >
                    <Animated.View
                      style={[
                        styles.micPulseRing,
                        {
                          transform: [{ scale: pulseAnim }],
                          opacity: pulseOpacity,
                        },
                      ]}
                    />
                    {isListening ? (
                      <Square size={14} color="#fff" fill="#fff" />
                    ) : (
                      <Mic size={18} color={colors.brand} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
      <AttachmentPopover
        visible={showPopover}
        onClose={() => setShowPopover(false)}
        onCamera={handleCamera}
        onPhotos={handlePhotos}
        anchorY={popoverAnchorY}
      />
    </View>
  );
}

/**
 * Child component that mounts ONLY after the speech module is loaded.
 * Isolates useSpeechEvent hooks so they never run during the initial
 * Fabric mount transaction (which would crash on TurboModule queue).
 */
function SpeechListeners({
  finalizedText,
  setIdeaText,
  setIsListening,
  setIsSpeaking,
  showToast,
}: {
  finalizedText: React.MutableRefObject<string>;
  setIdeaText: (t: string) => void;
  setIsListening: (v: boolean) => void;
  setIsSpeaking: (v: boolean) => void;
  showToast: ReturnType<typeof import('../../contexts/ToastContext').useToast>['showToast'];
}) {
  const useSpeechEvent = _useSpeechEvent!;
  const speakingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useSpeechEvent('result', (event: any) => {
    const transcript = event.results[0]?.transcript || '';
    if (transcript) {
      // Speech detected — switch orb to "talking"
      setIsSpeaking(true);

      // Clear any pending fallback timer
      if (speakingTimer.current) clearTimeout(speakingTimer.current);

      if (event.isFinal) {
        finalizedText.current = finalizedText.current
          ? `${finalizedText.current} ${transcript}`
          : transcript;
        setIdeaText(finalizedText.current);
        setIsSpeaking(false);
      } else {
        const display = finalizedText.current
          ? `${finalizedText.current} ${transcript}`
          : transcript;
        setIdeaText(display);

        // If no new result within 500ms, drop back to listening
        speakingTimer.current = setTimeout(() => setIsSpeaking(false), 500);
      }
    }
  });

  useSpeechEvent('end', () => {
    setIsListening(false);
    setIsSpeaking(false);
  });

  useSpeechEvent('error', (event: any) => {
    setIsListening(false);
    setIsSpeaking(false);
    if (event.error !== 'no-speech') {
      showToast({ message: 'Voice recognition error', type: 'error' });
    }
  });

  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },

  // ── Center: Logo area ──
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoArea: {
    position: 'absolute',
    alignItems: 'center',
  },
  orbContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Bottom: Input bar ──
  inputBarWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  inputBar: {
    flexDirection: 'column',
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    // Shadow always present (invisible) to avoid compositing change on focus
    ...Platform.select({
      ios: {
        shadowColor: colors.brand,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 16,
      },
      android: {},
    }),
  },
  inputBarActive: {
    borderColor: colors.brandGlow,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.7,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  inputBarTopGlow: {
    position: 'absolute',
    top: -1,
    left: 24,
    right: 24,
    height: 2,
  },
  inputField: {
    fontSize: 16,
    ...fonts.geist.regular,
    color: colors.foreground,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: 0,
    paddingBottom: 10,
  },
  inputActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paperclipButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  micButtonActive: {
    backgroundColor: colors.brand,
  },
  micPulseRing: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  consentLabel: {
    fontSize: 13,
    color: colors.muted,
    ...fonts.geist.regular,
  },
});

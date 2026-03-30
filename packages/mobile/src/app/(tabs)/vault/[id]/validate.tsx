import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ChevronLeft, Send, RotateCcw, Zap } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { triggerHaptic } from '../../../../components/ui/Button';
import { Button } from '../../../../components/ui/Button';
import { BottomSheet } from '../../../../components/ui/BottomSheet';
import { Paywall } from '../../../../components/ui/Paywall';
import { useToast } from '../../../../contexts/ToastContext';
import { trpc } from '../../../../lib/trpc';
import { colors, fonts } from '../../../../lib/theme';
import { useAIConsentGate } from '../../../../hooks/useAIConsentGate';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

type ValidatePhase = 'chat' | 'validating' | 'error';

const THINKING_MESSAGES = [
  'Researching your market...',
  'Analyzing competitors...',
  'Estimating market size...',
  'Evaluating problem severity...',
  'Building your card...',
];

// Animated typing dot component
function TypingDot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0.4, { duration: 300, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.typingDot, animatedStyle]} />
  );
}

// Animated turn dot component
function AnimatedTurnDot({ active }: { active: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withSpring(1.3, { damping: 12, stiffness: 150 });
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
    }
  }, [active, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: active ? colors.brand : colors.border,
  }));

  return <Animated.View style={[styles.turnDot, animatedStyle]} />;
}

// Pulsing ring for loading state
function PulsingRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, [delay, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.pulsingRing, animatedStyle]} />
  );
}

// Core icon that pulses subtly
function PulsingCore() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.loadingCore, animatedStyle]}>
      <Zap size={22} color={colors.white} />
    </Animated.View>
  );
}

export default function ValidateScreen() {
  const { id, refine } = useLocalSearchParams<{ id: string; refine?: string }>();
  const isRefineMode = refine === '1';
  const router = useRouter();
  const { showToast } = useToast();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Validation state
  const [phase, setPhase] = useState<ValidatePhase>('chat');
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI consent gate
  const { checkConsent, ConsentGate } = useAIConsentGate();

  // tRPC mutations
  const chatMutation = trpc.sparkCard.chat.useMutation();
  const validateMutation = trpc.sparkCard.validate.useMutation();
  const utils = trpc.useUtils();

  // Start chat on mount — get first question (or show refine prompt)
  useEffect(() => {
    if (isRefineMode) {
      setMessages([
        { role: 'assistant', content: 'Please tell me how you would like to refine your idea.' },
      ]);
      setCurrentTurn(1);
      return;
    }

    // Gate: require AI consent before starting chat
    checkConsent().then((granted) => {
      if (!granted) return;
      chatMutation.mutate(
        { projectId: id!, turn: 0, message: '' },
        {
          onSuccess: (data) => {
            if (data.question) {
              setMessages([{ role: 'assistant', content: data.question }]);
              setCurrentTurn(1);
              setSuggestions(data.suggestions ?? []);
            }
          },
          onError: () => {
            triggerHaptic('error');
            showToast({ message: 'Failed to start validation', type: 'error' });
          },
        },
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotate thinking messages every 12 seconds
  useEffect(() => {
    if (phase !== 'validating') return;
    const interval = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [phase]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = userInput.trim();
    if (!trimmed || isSending) return;

    const newUserMessage: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setUserInput('');
    setIsSending(true);

    // In refine mode, skip the chat endpoint and go straight to validation
    if (isRefineMode) {
      setIsSending(false);
      startValidation(updatedMessages);
      return;
    }

    chatMutation.mutate(
      { projectId: id!, turn: currentTurn, message: trimmed },
      {
        onSuccess: (data) => {
          setIsSending(false);
          setSuggestions([]);

          if (data.complete) {
            // Chat complete — start validation
            startValidation(updatedMessages);
          } else if (data.question) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: data.question! },
            ]);
            setCurrentTurn((prev) => prev + 1);
            setSuggestions(data.suggestions ?? []);
          }
        },
        onError: () => {
          setIsSending(false);
          triggerHaptic('error');
          showToast({ message: 'Failed to send message', type: 'error' });
        },
      },
    );
  }, [userInput, isSending, messages, id, currentTurn, chatMutation, showToast, isRefineMode]);

  const startValidation = useCallback(
    (chatMessages: ChatMessage[]) => {
      setPhase('validating');
      setThinkingIndex(0);

      // 90-second timeout — show error if validation takes too long
      timeoutRef.current = setTimeout(() => {
        setPhase('error');
        showToast({ message: 'Validation timed out — tap retry', type: 'error' });
      }, 90000);

      // Format messages for the API
      const formattedMessages = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      validateMutation.mutate(
        { projectId: id!, chatMessages: formattedMessages, isRefine: isRefineMode },
        {
          onSuccess: (data) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            triggerHaptic('success');
            // Directly update the cached project with the new cardResult (and
            // refined title/description if this was a refinement) so the card
            // screen renders it immediately.
            utils.project.get.setData({ id: id! }, (old) => {
              if (!old) return old;
              return {
                ...old,
                cardResult: data.cardResult,
                ...(data.refinedTitle && { title: data.refinedTitle }),
                ...(data.refinedDescription && { description: data.refinedDescription }),
              };
            });
            utils.project.list.invalidate();
            // Navigate to card screen
            router.replace(`/(tabs)/vault/${id}/card` as any);
          },
          onError: (error) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            triggerHaptic('error');

            const errorMsg = error.message;

            if (errorMsg === 'CARD_LIMIT_REACHED') {
              setPhase('chat');
              setShowPaywall(true);
              return;
            }

            if (
              errorMsg === 'SONAR_TIMEOUT' ||
              errorMsg === 'EXTRACTION_FAILED'
            ) {
              setPhase('error');
              showToast({
                message: 'Validation failed — tap retry to try again',
                type: 'error',
              });
              return;
            }

            // Generic / timeout error
            setPhase('error');
            showToast({
              message: 'Something went wrong — tap retry to try again',
              type: 'error',
            });
          },
        },
      );
    },
    [id, validateMutation, utils, router, showToast],
  );

  const handleRetry = useCallback(() => {
    startValidation(messages);
  }, [messages, startValidation]);

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isAssistant = item.role === 'assistant';
    return (
      <Animated.View
        entering={
          isAssistant
            ? FadeInLeft.springify().damping(14).stiffness(120)
            : FadeInRight.springify().damping(14).stiffness(120)
        }
      >
        <View
          style={[
            styles.messageBubble,
            isAssistant ? styles.assistantBubble : styles.userBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isAssistant ? styles.assistantText : styles.userText,
            ]}
          >
            {item.content}
          </Text>
        </View>
      </Animated.View>
    );
  };

  // Validating / thinking state with pulsing rings
  if (phase === 'validating') {
    return (
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Validate</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.thinkingContainer}>
          {/* Pulsing rings */}
          <View style={styles.loadingRings}>
            <PulsingRing delay={0} />
            <PulsingRing delay={400} />
            <PulsingRing delay={800} />
            <PulsingCore />
          </View>

          {/* Status text with crossfade */}
          <Animated.Text
            key={thinkingIndex}
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(300)}
            style={styles.thinkingText}
          >
            {THINKING_MESSAGES[thinkingIndex]}
          </Animated.Text>
          <Text style={styles.thinkingSubtext}>
            This can take 30-60 seconds
          </Text>
        </View>

        {/* Paywall BottomSheet */}
        <BottomSheet
          visible={showPaywall}
          onClose={() => {
            setShowPaywall(false);
            router.back();
          }}
          title="Card Limit Reached"
        >
          <Paywall compact />
        </BottomSheet>
      </View>
    );
  }

  // Error state with retry
  if (phase === 'error') {
    return (
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Validate</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>{'⚠️'}</Text>
          <Text style={styles.errorTitle}>Validation Failed</Text>
          <Text style={styles.errorSubtext}>
            The market research timed out or encountered an error. Your
            validation credit has been refunded.
          </Text>
          <Button
            variant="primary"
            size="lg"
            onPress={handleRetry}
            leftIcon={<RotateCcw size={18} color={colors.white} />}
            isLoading={validateMutation.isPending}
            style={styles.retryButton}
          >
            Retry Validation
          </Button>
          <Button
            variant="ghost"
            size="md"
            onPress={() => router.back()}
          >
            Go Back
          </Button>
        </View>

        {/* Paywall BottomSheet */}
        <BottomSheet
          visible={showPaywall}
          onClose={() => {
            setShowPaywall(false);
            router.back();
          }}
          title="Card Limit Reached"
        >
          <Paywall compact />
        </BottomSheet>
      </View>
    );
  }

  // Chat phase
  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isRefineMode ? 'Refine Idea' : 'Quick Validate'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Turn indicator with animated dots (hidden in refine mode) */}
        {!isRefineMode && (
          <View style={styles.turnIndicator}>
            {[0, 1, 2].map((i) => (
              <AnimatedTurnDot key={i} active={currentTurn > i} />
            ))}
            <Text style={styles.turnText}>
              {Math.min(currentTurn, 3)} of 3 questions
            </Text>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, idx) => String(idx)}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            suggestions.length > 0 && !isSending ? (
              <Animated.View entering={FadeIn.duration(200)} style={styles.suggestionsContainer}>
                {suggestions.map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setUserInput(suggestion);
                      const newUserMessage: ChatMessage = { role: 'user', content: suggestion };
                      const updatedMessages = [...messages, newUserMessage];
                      setMessages(updatedMessages);
                      setSuggestions([]);
                      setIsSending(true);

                      chatMutation.mutate(
                        { projectId: id!, turn: currentTurn, message: suggestion },
                        {
                          onSuccess: (data) => {
                            setIsSending(false);
                            setUserInput('');

                            if (data.complete) {
                              startValidation(updatedMessages);
                            } else if (data.question) {
                              setMessages((prev) => [
                                ...prev,
                                { role: 'assistant', content: data.question! },
                              ]);
                              setCurrentTurn((prev) => prev + 1);
                              setSuggestions(data.suggestions ?? []);
                            }
                          },
                          onError: () => {
                            setIsSending(false);
                            setUserInput('');
                            triggerHaptic('error');
                            showToast({ message: 'Failed to send message', type: 'error' });
                          },
                        },
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Zap size={16} color={colors.brand} />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            ) : null
          }
        />

        {/* Typing indicator with animated bouncing dots */}
        {isSending && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[styles.messageBubble, styles.assistantBubble]}
          >
            <View style={styles.typingDots}>
              <TypingDot delay={0} />
              <TypingDot delay={150} />
              <TypingDot delay={300} />
            </View>
          </Animated.View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={userInput}
            onChangeText={setUserInput}
            placeholder={isRefineMode ? "Describe how you'd like to refine..." : "Type your answer..."}
            placeholderTextColor={colors.mutedDim}
            multiline
            maxLength={500}
            editable={!isSending}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!userInput.trim() || isSending}
            style={[
              styles.sendButton,
              (!userInput.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Send size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Paywall BottomSheet */}
      <BottomSheet
        visible={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          router.back();
        }}
        title="Card Limit Reached"
      >
        <Paywall compact />
      </BottomSheet>
      {ConsentGate}
    </View>
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
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  turnText: {
    fontSize: 12,
    color: colors.muted,
    ...fonts.geist.medium,
    marginLeft: 4,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    ...fonts.geist.regular,
    lineHeight: 22,
  },
  assistantText: {
    color: colors.foreground,
  },
  userText: {
    color: colors.white,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.muted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    ...fonts.geist.regular,
    color: colors.foreground,
    lineHeight: 22,
  },
  thinkingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 40,
  },
  // Pulsing rings loading state
  loadingRings: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pulsingRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  loadingCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingText: {
    fontSize: 16,
    ...fonts.geist.medium,
    color: colors.foreground,
    textAlign: 'center',
  },
  thinkingSubtext: {
    fontSize: 13,
    color: colors.mutedDim,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  retryButton: {
    width: '100%',
  },
});

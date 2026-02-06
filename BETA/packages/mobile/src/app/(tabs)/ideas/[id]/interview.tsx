import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../../../lib/trpc';
import { INTERVIEW_MODE_LABELS } from '@forge/shared';

// Forge Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
};

const MODE_COLORS: Record<string, { color: string; bg: string }> = {
  IN_DEPTH: { color: colors.primary, bg: colors.primaryMuted },
  LIGHT: { color: colors.accent, bg: colors.accentMuted },
  SPARK: { color: colors.warning, bg: colors.warningMuted },
};

const MODE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  IN_DEPTH: 'flame',
  LIGHT: 'flash-outline',
  SPARK: 'sparkles',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Loading Screen
function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingSpinner}>
        <Ionicons name="chatbubbles" size={32} color={colors.primary} />
      </View>
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

// Typing Indicator
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, []);

  const getDotStyle = (dot: Animated.Value) => ({
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, getDotStyle(dot1)]} />
        <Animated.View style={[styles.typingDot, getDotStyle(dot2)]} />
        <Animated.View style={[styles.typingDot, getDotStyle(dot3)]} />
      </View>
    </View>
  );
}

// Message Bubble
function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAssistant,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isUser
            ? styles.userBubble
            : isSystem
            ? styles.systemBubble
            : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser
              ? styles.userText
              : isSystem
              ? styles.systemText
              : styles.assistantText,
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export default function InterviewScreen() {
  const { id: ideaId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const utils = trpc.useUtils();

  const { data: interviews, isLoading: interviewLoading } =
    trpc.interview.listByIdea.useQuery({ ideaId });

  const activeInterview = interviews?.find((i) => i.status === 'IN_PROGRESS');

  const sendMessage = trpc.interview.addMessage.useMutation({
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      setInput('');
      utils.interview.listByIdea.invalidate({ ideaId });
    },
    onSettled: () => {
      setIsTyping(false);
    },
  });

  const completeInterview = trpc.interview.complete.useMutation({
    onSuccess: () => {
      router.replace(`/(tabs)/ideas/${ideaId}` as never);
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [activeInterview?.messages, isTyping]);

  // Parse messages from JSON
  const messages: Message[] = activeInterview?.messages
    ? (activeInterview.messages as unknown as Message[])
    : [];

  const handleSubmit = () => {
    if (!input.trim() || !activeInterview || sendMessage.isPending) return;

    sendMessage.mutate({
      interviewId: activeInterview.id,
      content: input.trim(),
    });
  };

  if (interviewLoading) {
    return <LoadingScreen message="Loading interview..." />;
  }

  if (!activeInterview) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>No active interview</Text>
          <Text style={styles.emptyDescription}>
            This interview may have been completed
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.replace(`/(tabs)/ideas/${ideaId}` as never)}
          >
            <Text style={styles.emptyButtonText}>Go Back to Idea</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const modeStyle = MODE_COLORS[activeInterview.mode] || MODE_COLORS.LIGHT;
  const modeIcon = MODE_ICONS[activeInterview.mode] || 'chatbubbles';
  const progress =
    activeInterview.maxTurns > 0
      ? Math.round((activeInterview.currentTurn / activeInterview.maxTurns) * 100)
      : 0;
  const isComplete = activeInterview.status === 'COMPLETE';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header Info */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.modeBadge, { backgroundColor: modeStyle.bg }]}>
              <Ionicons name={modeIcon} size={14} color={modeStyle.color} />
              <Text style={[styles.modeBadgeText, { color: modeStyle.color }]}>
                {INTERVIEW_MODE_LABELS[activeInterview.mode] || activeInterview.mode}
              </Text>
            </View>
            <Text style={styles.turnText}>
              Turn {activeInterview.currentTurn} of {activeInterview.maxTurns}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress}%`, backgroundColor: modeStyle.color },
                ]}
              />
            </View>
            {activeInterview.currentTurn >= activeInterview.maxTurns - 1 && !isComplete && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => completeInterview.mutate({ id: activeInterview.id })}
                disabled={completeInterview.isPending}
              >
                <Text style={[styles.completeButtonText, { color: modeStyle.color }]}>
                  {completeInterview.isPending ? 'Completing...' : 'Complete'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Messages */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.messagesContainer}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  isLast={index === messages.length - 1}
                />
              ))}

              {isTyping && <TypingIndicator />}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>

        {/* Input */}
        {!isComplete ? (
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="Type your response..."
                placeholderTextColor={colors.muted}
                multiline
                maxLength={2000}
                editable={!sendMessage.isPending}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!input.trim() || sendMessage.isPending) && styles.sendButtonDisabled,
                  input.trim() && !sendMessage.isPending && { backgroundColor: modeStyle.color },
                ]}
                onPress={handleSubmit}
                disabled={!input.trim() || sendMessage.isPending}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={!input.trim() || sendMessage.isPending ? colors.muted : '#fff'}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.completeContainer}>
            <View style={styles.completeContent}>
              <View>
                <Text style={styles.completeTitle}>Interview Complete</Text>
                <Text style={styles.completeSubtitle}>
                  Your responses have been recorded
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewIdeaButton}
                onPress={() => router.replace(`/(tabs)/ideas/${ideaId}` as never)}
              >
                <Text style={styles.viewIdeaButtonText}>View Idea</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerLeft: {
    flex: 1,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 4,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  turnText: {
    fontSize: 12,
    color: colors.muted,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  progressBarContainer: {
    width: 80,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  completeButton: {
    marginTop: 8,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Messages
  messagesContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    backgroundColor: colors.mutedBg,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: colors.foreground,
  },
  systemText: {
    color: colors.muted,
    fontStyle: 'italic',
  },
  // Typing Indicator
  typingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  // Input
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 16,
    fontSize: 15,
    color: colors.foreground,
    maxHeight: 120,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mutedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.mutedBg,
  },
  // Complete Footer
  completeContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.successMuted,
    padding: 16,
  },
  completeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 2,
  },
  completeSubtitle: {
    fontSize: 13,
    color: colors.success,
    opacity: 0.8,
  },
  viewIdeaButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.success,
    borderRadius: 10,
  },
  viewIdeaButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});

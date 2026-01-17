import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../../lib/trpc';
import { Button, LoadingScreen, Card, CardContent, Badge } from '../../../components/ui';
import { INTERVIEW_MODE_LABELS } from '@forge/shared';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
      router.replace(`/ideas/${ideaId}`);
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [activeInterview?.messages]);

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
      <SafeAreaView className="flex-1 bg-gray-50 p-4" edges={['bottom']}>
        <Card>
          <CardContent className="items-center py-8">
            <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
            <Text className="mt-4 text-lg font-medium text-gray-900">
              No active interview
            </Text>
            <Text className="mt-1 text-gray-500">
              This interview may have been completed
            </Text>
            <Button
              className="mt-4"
              onPress={() => router.replace(`/ideas/${ideaId}`)}
            >
              Go Back to Idea
            </Button>
          </CardContent>
        </Card>
      </SafeAreaView>
    );
  }

  const progress =
    activeInterview.maxTurns > 0
      ? Math.round((activeInterview.currentTurn / activeInterview.maxTurns) * 100)
      : 0;
  const isComplete = activeInterview.status === 'COMPLETE';

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header Info */}
        <View className="border-b border-gray-200 bg-white px-4 py-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-medium text-gray-900">
                {INTERVIEW_MODE_LABELS[activeInterview.mode]} Interview
              </Text>
              <Text className="text-xs text-gray-500">
                Turn {activeInterview.currentTurn} of {activeInterview.maxTurns}
              </Text>
            </View>
            <View className="items-end">
              <View className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                <View
                  className="h-full bg-blue-600"
                  style={{ width: `${progress}%` }}
                />
              </View>
              {activeInterview.currentTurn >= activeInterview.maxTurns - 1 && !isComplete && (
                <TouchableOpacity
                  className="mt-2"
                  onPress={() => completeInterview.mutate({ id: activeInterview.id })}
                  disabled={completeInterview.isPending}
                >
                  <Text className="text-sm font-medium text-blue-600">
                    {completeInterview.isPending ? 'Completing...' : 'Complete'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 bg-gray-50"
          contentContainerClassName="p-4"
        >
          {messages.map((message, index) => (
            <View
              key={index}
              className={`mb-3 flex-row ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <View
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600'
                    : message.role === 'system'
                    ? 'bg-gray-200'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <Text
                  className={`${
                    message.role === 'user'
                      ? 'text-white'
                      : message.role === 'system'
                      ? 'text-gray-600 italic'
                      : 'text-gray-900'
                  }`}
                >
                  {message.content}
                </Text>
              </View>
            </View>
          ))}

          {isTyping && (
            <View className="mb-3 flex-row justify-start">
              <View className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <View className="flex-row space-x-1">
                  <View className="h-2 w-2 animate-pulse rounded-full bg-gray-400" />
                  <View className="h-2 w-2 animate-pulse rounded-full bg-gray-400" />
                  <View className="h-2 w-2 animate-pulse rounded-full bg-gray-400" />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        {!isComplete ? (
          <View className="border-t border-gray-200 bg-white p-4">
            <View className="flex-row items-end space-x-2">
              <TextInput
                ref={inputRef}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base"
                value={input}
                onChangeText={setInput}
                placeholder="Type your response..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={2000}
                editable={!sendMessage.isPending}
              />
              <TouchableOpacity
                className={`h-12 w-12 items-center justify-center rounded-full ${
                  !input.trim() || sendMessage.isPending
                    ? 'bg-gray-200'
                    : 'bg-blue-600'
                }`}
                onPress={handleSubmit}
                disabled={!input.trim() || sendMessage.isPending}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={!input.trim() || sendMessage.isPending ? '#9ca3af' : '#fff'}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="border-t border-gray-200 bg-green-50 p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-medium text-green-800">Interview Complete</Text>
                <Text className="text-sm text-green-600">
                  Your responses have been recorded
                </Text>
              </View>
              <Button
                size="sm"
                onPress={() => router.replace(`/ideas/${ideaId}`)}
              >
                View Idea
              </Button>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

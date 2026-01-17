import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { Card, CardContent, Button, Input } from '../../components/ui';
import { INTERVIEW_MODE_LABELS, INTERVIEW_MODE_DESCRIPTIONS, InterviewMode } from '@forge/shared';

const interviewModes: InterviewMode[] = ['LIGHTNING', 'LIGHT', 'IN_DEPTH'];

export default function NewIdeaScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<InterviewMode>('LIGHT');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  const startInterview = trpc.idea.startInterview.useMutation();

  const createIdea = trpc.idea.create.useMutation({
    onSuccess: async (data) => {
      await startInterview.mutateAsync({ ideaId: data.id, mode });
      router.replace(`/ideas/${data.id}/interview`);
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create idea: ' + error.message);
    },
  });

  const handleSubmit = () => {
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

    createIdea.mutate({ title, description });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        {/* Form */}
        <Card className="mb-4">
          <CardContent>
            <Input
              label="Idea Title"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="e.g., AI-Powered Recipe App"
              error={errors.title}
            />

            <View className="mb-4">
              <Text className="mb-1.5 text-sm font-medium text-gray-700">
                Description
              </Text>
              <Input
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }}
                placeholder="Describe your business idea, the problem it solves, and your target audience..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                error={errors.description}
                className="min-h-[100px]"
              />
            </View>
          </CardContent>
        </Card>

        {/* Interview Mode Selection */}
        <Card className="mb-4">
          <CardContent>
            <Text className="mb-3 text-base font-medium text-gray-900">
              Interview Mode
            </Text>
            <Text className="mb-4 text-sm text-gray-500">
              Choose how in-depth you want the AI interview to be
            </Text>

            <View className="space-y-3">
              {interviewModes.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  className={`rounded-xl border-2 p-4 ${
                    mode === m
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`font-medium ${
                        mode === m ? 'text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      {INTERVIEW_MODE_LABELS[m]}
                    </Text>
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                        mode === m
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {mode === m && (
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      )}
                    </View>
                  </View>
                  <Text
                    className={`mt-1 text-sm ${
                      mode === m ? 'text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    {INTERVIEW_MODE_DESCRIPTIONS[m]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </CardContent>
        </Card>
      </ScrollView>

      {/* Footer */}
      <View className="border-t border-gray-200 bg-white p-4">
        <Button
          onPress={handleSubmit}
          isLoading={createIdea.isPending || startInterview.isPending}
          size="lg"
        >
          {mode === 'LIGHTNING' ? 'Create & Start Research' : 'Create & Start Interview'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

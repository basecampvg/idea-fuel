import React, { useState } from 'react';
import { View, Text, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui';

export default function SignInScreen() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      Alert.alert(
        'Sign In Failed',
        'Unable to sign in with Google. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="mt-12 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-blue-600">
            <Text className="text-3xl font-bold text-white">F</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900">Welcome to Forge</Text>
          <Text className="mt-2 text-center text-gray-500">
            AI-powered business automation to validate and grow your ideas
          </Text>
        </View>

        {/* Features */}
        <View className="mt-12 space-y-4">
          <View className="flex-row items-center">
            <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Ionicons name="bulb-outline" size={20} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-gray-900">Capture Ideas</Text>
              <Text className="text-sm text-gray-500">
                Document and refine your business concepts
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Ionicons name="chatbubbles-outline" size={20} color="#16a34a" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-gray-900">AI Interviews</Text>
              <Text className="text-sm text-gray-500">
                Discover insights through guided conversations
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Ionicons name="analytics-outline" size={20} color="#9333ea" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-gray-900">Market Research</Text>
              <Text className="text-sm text-gray-500">
                Get comprehensive competitive analysis
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <Ionicons name="document-text-outline" size={20} color="#ea580c" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-gray-900">Business Reports</Text>
              <Text className="text-sm text-gray-500">
                Generate professional documents automatically
              </Text>
            </View>
          </View>
        </View>

        {/* Sign In Buttons */}
        <View className="mt-auto mb-8">
          <Button
            onPress={handleGoogleSignIn}
            isLoading={isLoading}
            size="lg"
            leftIcon={<Ionicons name="logo-google" size={20} color="#fff" />}
          >
            Continue with Google
          </Button>

          <Text className="mt-6 text-center text-xs text-gray-400">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

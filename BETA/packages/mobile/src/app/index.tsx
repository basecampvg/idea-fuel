import React, { useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/ui';

export default function SplashScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/(auth)/signin');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <View className="flex-1 items-center justify-center bg-blue-600">
      <View className="items-center">
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-3xl bg-white">
          <Text className="text-4xl font-bold text-blue-600">F</Text>
        </View>
        <Text className="text-3xl font-bold text-white">Forge</Text>
        <Text className="mt-2 text-blue-100">AI-Powered Business Automation</Text>
      </View>
      <View className="absolute bottom-20">
        <LoadingScreen message="" />
      </View>
    </View>
  );
}

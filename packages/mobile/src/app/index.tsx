import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Spinner } from '../components/ui';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(tabs)/capture' as any);
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <View className="items-center">
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-3xl bg-primary">
          <Text className="text-4xl font-bold text-white">iL</Text>
        </View>
        <Text className="text-3xl font-bold text-foreground">ideationLab</Text>
        <Text className="mt-2 text-muted-foreground">AI-Powered Business Automation</Text>
      </View>
      <View className="absolute bottom-20">
        <Spinner size="large" />
      </View>
    </View>
  );
}

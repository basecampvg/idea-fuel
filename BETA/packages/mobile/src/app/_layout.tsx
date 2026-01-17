import '../global.css';
import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { trpc, createTRPCClient, createQueryClient } from '../lib/trpc';

export default function RootLayout() {
  const [queryClient] = useState(() => createQueryClient());
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="auto" />
            </AuthProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

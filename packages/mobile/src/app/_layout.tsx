import '../global.css';
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { trpc, createTRPCClient, createQueryClient } from '../lib/trpc';
import { initLogger, installGlobalHandlers } from '../lib/logger';

export default function RootLayout() {
  const [queryClient] = useState(() => createQueryClient());
  const [trpcClient] = useState(() => createTRPCClient());

  useEffect(() => {
    initLogger();
    installGlobalHandlers();
  }, []);
  const [fontsLoaded] = useFonts({
    'SFProDisplay-Regular': require('../../assets/fonts/SF-Pro-Display-Regular.otf'),
    'SFProDisplay-Medium': require('../../assets/fonts/SF-Pro-Display-Medium.otf'),
    'SFProDisplay-Semibold': require('../../assets/fonts/SF-Pro-Display-Semibold.otf'),
    'SFProDisplay-Bold': require('../../assets/fonts/SF-Pro-Display-Bold.otf'),
    'SFProDisplay-Heavy': require('../../assets/fonts/SF-Pro-Display-Heavy.otf'),
    'SFProDisplay-Black': require('../../assets/fonts/SF-Pro-Display-Black.otf'),
    'SFProText-Regular': require('../../assets/fonts/SF-Pro-Text-Regular.otf'),
    'SFProText-Medium': require('../../assets/fonts/SF-Pro-Text-Medium.otf'),
    'SFProText-Semibold': require('../../assets/fonts/SF-Pro-Text-Semibold.otf'),
    'SFProText-Bold': require('../../assets/fonts/SF-Pro-Text-Bold.otf'),
    'SFProText-Light': require('../../assets/fonts/SF-Pro-Text-Light.otf'),
    'GeistMono-Regular': require('../../assets/fonts/GeistMono-Regular.ttf'),
    'GeistMono-Medium': require('../../assets/fonts/GeistMono-Medium.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ToastProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="settings"
                    options={{
                      presentation: 'modal',
                      headerShown: false,
                      animation: 'slide_from_bottom',
                    }}
                  />
                </Stack>
                <StatusBar style="light" />
              </ToastProvider>
            </AuthProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

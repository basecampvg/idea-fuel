import React from 'react';
import { Stack } from 'expo-router';
import { Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../lib/theme';

function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      style={{ marginRight: 8 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <ChevronLeft size={24} color={colors.foreground} />
    </Pressable>
  );
}

export default function SettingsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: colors.foreground,
        },
        headerShadowVisible: false,
        headerBackVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="plans"
        options={{
          title: 'Manage Plan',
          // @ts-expect-error -- react-native-screens 4.18+ API, not yet in Expo Router types
          unstable_headerLeftItems: () => [
            {
              type: 'custom',
              element: <BackButton />,
              hidesSharedBackground: true,
            },
          ],
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: 'About',
          // @ts-expect-error -- react-native-screens 4.18+ API, not yet in Expo Router types
          unstable_headerLeftItems: () => [
            {
              type: 'custom',
              element: <BackButton />,
              hidesSharedBackground: true,
            },
          ],
        }}
      />
    </Stack>
  );
}

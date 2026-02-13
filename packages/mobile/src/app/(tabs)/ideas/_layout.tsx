import React from 'react';
import { Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ideationLab Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  primary: '#E91E8C',
};

export default function IdeasStackLayout() {
  const router = useRouter();

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
        contentStyle: {
          backgroundColor: colors.background,
        },
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 8 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
          ) : null,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'New Project',
          headerStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name="[id]/interview"
        options={{
          title: 'Interview',
          headerStyle: {
            backgroundColor: colors.card,
          },
        }}
      />
    </Stack>
  );
}

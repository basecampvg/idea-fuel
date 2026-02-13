import React from 'react';
import { Stack } from 'expo-router';

// ideationLab Design System Colors
const colors = {
  background: '#11100E',
  foreground: '#E8E4DC',
};

export default function DailyPickLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Daily Pick',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Pick History',
        }}
      />
      <Stack.Screen
        name="[dateLocal]"
        options={{
          title: 'Pick Details',
        }}
      />
    </Stack>
  );
}

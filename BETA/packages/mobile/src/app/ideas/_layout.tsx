import React from 'react';
import { Stack } from 'expo-router';

export default function IdeasLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="new"
        options={{
          title: 'New Idea',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: 'Idea Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="[id]/interview"
        options={{
          title: 'Interview',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}

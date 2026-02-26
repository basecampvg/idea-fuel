import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Mic, ShieldCheck, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingScreen } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  const tabBarHeight = 52 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.mutedDim,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: insets.bottom + 4,
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Mic size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <ShieldCheck size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

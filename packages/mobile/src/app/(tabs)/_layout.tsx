import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Tabs, Redirect, useRouter } from 'expo-router';
import { Mic, ShieldCheck, Settings, ArrowUpRight, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingScreen } from '../../components/ui';
import { colors } from '../../lib/theme';

function CustomTabBar({ state, descriptors, navigation, insets }: any) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <View>
      {/* Promo banner */}
      {!dismissed && (
        <View style={bannerStyles.container}>
          <TouchableOpacity
            style={bannerStyles.content}
            onPress={() => Linking.openURL('https://ideafuel.ai')}
            activeOpacity={0.8}
          >
            <Text style={bannerStyles.text}>
              Validate your idea on the web
            </Text>
            <ArrowUpRight size={14} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setDismissed(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={bannerStyles.dismiss}
          >
            <X size={14} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      )}

      {/* Standard tab bar */}
      <View style={[
        tabStyles.bar,
        { paddingBottom: insets.bottom + 4 },
      ]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? colors.brand : colors.mutedDim;

          const icon = route.name === 'capture'
            ? <Mic size={22} color={color} />
            : route.name === 'vault'
            ? <ShieldCheck size={22} color={color} />
            : <Settings size={22} color={color} />;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={tabStyles.tab}
              activeOpacity={0.7}
            >
              {icon}
              <Text style={[tabStyles.label, { color }]}>
                {options.title ?? route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  const headerTitle = () => (
    <View style={headerStyles.wordmark}>
      <Text style={headerStyles.wordmarkIdea}>IDEA </Text>
      <Text style={headerStyles.wordmarkFuel}>FUEL</Text>
    </View>
  );

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerShadowVisible: false,
        headerTitle,
      }}
    >
      <Tabs.Screen
        name="capture"
        options={{ title: 'Capture' }}
      />
      <Tabs.Screen
        name="vault"
        options={{ title: 'Vault' }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.replace('/(tabs)/vault' as any);
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings' }}
      />
    </Tabs>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dismiss: {
    padding: 4,
  },
});

const headerStyles = StyleSheet.create({
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkIdea: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 4,
    color: '#BCBCBC',
  },
  wordmarkFuel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 4,
    color: colors.brand,
  },
});

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});

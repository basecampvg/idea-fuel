import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Tabs, Redirect, useRouter } from 'expo-router';
import { Mic, Vault, Lightbulb, ArrowUpRight, X, Pencil } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingScreen } from '../../components/ui';
import { colors, fonts } from '../../lib/theme';

function CustomTabBar({ state, descriptors, navigation, insets }: any) {
  return (
    <BlurView intensity={40} tint="dark" style={tabStyles.blurWrap}>
      <View style={[
        tabStyles.bar,
        { paddingBottom: insets.bottom + 4 },
      ]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? colors.brand : colors.white;

          const icon = route.name === 'capture'
            ? <Mic size={22} color={color} />
            : route.name === 'vault'
            ? <Vault size={22} color={color} />
            : route.name === 'thoughts'
            ? <Lightbulb size={22} color={color} />
            : route.name === 'sketch'
            ? <Pencil size={22} color={color} />
            : null;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (event.defaultPrevented) return;

                if (!isFocused) {
                  navigation.navigate(route.name);
                } else {
                  // Pop to top of the nested stack when tapping the already-focused tab.
                  // This replaces the old router.replace() approach which caused a full
                  // navigation state replacement and SIGABRT crashes under Fabric.
                  navigation.navigate(route.name, { screen: 'index' });
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
    </BlurView>
  );
}

const headerTitle = () => (
  <View style={headerStyles.wordmark}>
    <Text style={headerStyles.wordmarkIdea}>IDEA </Text>
    <Text style={headerStyles.wordmarkFuel}>FUEL</Text>
  </View>
);

function AvatarButton() {
  const router = useRouter();
  const { user } = useAuth();
  const initial = (user?.name ?? user?.email ?? '?')[0].toUpperCase();

  return (
    <TouchableOpacity
      onPress={() => router.push('/settings')}
      style={headerStyles.avatar}
      activeOpacity={0.7}
    >
      <Text style={headerStyles.avatarText}>{initial}</Text>
    </TouchableOpacity>
  );
}

function Banner({ onDismiss }: { onDismiss: () => void }) {
  return (
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
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={bannerStyles.dismiss}
      >
        <X size={14} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const dismissBanner = useCallback(() => setBannerDismissed(true), []);

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

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
        headerRight: () => <AvatarButton />,
        headerRightContainerStyle: { paddingRight: 16 },
        // @ts-expect-error headerBottom works at runtime but isn't in BottomTabNavigationOptions type
        headerBottom: bannerDismissed
          ? undefined
          : () => <Banner onDismiss={dismissBanner} />,
      }}
    >
      <Tabs.Screen
        name="thoughts"
        options={{ title: 'Thoughts' }}
      />
      <Tabs.Screen
        name="notes"
        options={{ title: 'Notes', href: null }}
      />
      <Tabs.Screen
        name="sandbox"
        options={{ title: 'Sandbox', href: null }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerBackground: () => (
            <BlurView intensity={40} tint="dark" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,10,0.92)' }]} />
          ),
        }}
      />
      <Tabs.Screen
        name="sketch"
        options={{ title: 'Sketch' }}
      />
      <Tabs.Screen
        name="vault"
        options={{ title: 'Vault' }}
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
    fontSize: 14,
    ...fonts.outfit.black,
    letterSpacing: 3,
    color: '#BCBCBC',
  },
  wordmarkFuel: {
    fontSize: 14,
    ...fonts.outfit.black,
    letterSpacing: 3,
    color: colors.brand,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
});

const tabStyles = StyleSheet.create({
  blurWrap: {
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.92)',
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

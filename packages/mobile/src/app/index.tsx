import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Spinner } from '../components/ui';
import { IdeaFuelLogo } from '../components/IdeaFuelLogo';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(tabs)/capture' as any);
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#161513' }}>
      <View style={{ alignItems: 'center' }}>
        {/* Flame logo */}
        <View style={{ marginBottom: 20 }}>
          <IdeaFuelLogo size={80} />
        </View>

        {/* IDEA FUEL wordmark */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            letterSpacing: 4,
            color: '#BCBCBC',
          }}>
            IDEA{' '}
          </Text>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            letterSpacing: 4,
            color: '#E32B1A',
          }}>
            FUEL
          </Text>
        </View>

        {/* Tagline */}
        <Text style={{ marginTop: 12, color: '#8A8680', fontSize: 14 }}>
          Don't let your ideas die
        </Text>
      </View>
      <View style={{ position: 'absolute', bottom: 80 }}>
        <Spinner size="large" />
      </View>
    </View>
  );
}

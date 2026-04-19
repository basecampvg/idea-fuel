import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Spinner } from '../components/ui';
import { IdeaFuelLogo } from '../components/IdeaFuelLogo';
import { useAuth } from '../contexts/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)/capture' as any);
      } else {
        router.replace('/(auth)/signin' as any);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A1A' }}>
      <View style={{ alignItems: 'center' }}>
        {/* Flame logo */}
        <View style={{ marginBottom: 20 }}>
          <IdeaFuelLogo size={80} />
        </View>

        {/* IDEA FUEL wordmark */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{
            fontSize: 24,
            fontFamily: 'SFProDisplay-Black',
            fontWeight: '900',
            letterSpacing: 3,
            color: '#BCBCBC',
          }}>
            IDEA{' '}
          </Text>
          <Text style={{
            fontSize: 24,
            fontFamily: 'SFProDisplay-Black',
            fontWeight: '900',
            letterSpacing: 3,
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

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Spinner } from '../components/ui';

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
        {/* Flame icon */}
        <View style={{
          marginBottom: 20,
          width: 80,
          height: 80,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Ionicons name="flame" size={64} color="#E32B1A" />
        </View>

        {/* IDEA FUEL wordmark */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            letterSpacing: 4,
            color: '#BCBCBC',
            textTransform: 'uppercase',
          }}>
            IDEA{' '}
          </Text>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            letterSpacing: 4,
            color: '#E32B1A',
            textTransform: 'uppercase',
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

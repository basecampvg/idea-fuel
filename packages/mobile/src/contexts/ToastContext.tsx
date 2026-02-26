import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ToastData {
  message: string;
  projectId?: string;
  projectTitle?: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  showToast: (data: ToastData) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

const colors = {
  card: '#1A1918',
  border: '#2A2928',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  primary: '#E91E8C',
  accent: '#14B8A6',
  destructive: '#EF4444',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [toast, setToast] = useState<ToastData | null>(null);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 });
    setTimeout(() => setToast(null), 300);
  }, [translateY, opacity]);

  const showToast = useCallback((data: ToastData) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setToast(data);
    translateY.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 300 });
    dismissTimer.current = setTimeout(() => {
      hideToast();
    }, 3000);
  }, [translateY, opacity, hideToast]);

  const handlePress = useCallback(() => {
    if (toast?.projectId) {
      hideToast();
      router.push(`/(tabs)/vault/${toast.projectId}` as any);
    }
  }, [toast, hideToast, router]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const iconName = toast?.type === 'error' ? 'alert-circle' : toast?.type === 'info' ? 'information-circle' : 'checkmark-circle';
  const iconColor = toast?.type === 'error' ? colors.destructive : toast?.type === 'info' ? colors.accent : colors.primary;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            { top: insets.top + 8 },
            animatedStyle,
          ]}
        >
          <TouchableOpacity
            style={styles.toast}
            onPress={handlePress}
            activeOpacity={toast.projectId ? 0.7 : 1}
          >
            <Ionicons name={iconName} size={20} color={iconColor} />
            <View style={styles.textContainer}>
              <Text style={styles.message} numberOfLines={1}>
                {toast.message}
              </Text>
              {toast.projectTitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {toast.projectTitle}
                </Text>
              )}
            </View>
            {toast.projectId && (
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    width: width - 32,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
});

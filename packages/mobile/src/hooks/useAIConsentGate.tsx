import React, { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIConsentSheet } from '../components/ui/AIConsentSheet';
import { useToast } from '../contexts/ToastContext';

const STORAGE_KEY = 'ideafuel_ai_consent';

export function useAIConsentGate() {
  const [showConsent, setShowConsent] = useState(false);
  const { showToast } = useToast();
  const resolveRef = useRef<((granted: boolean) => void) | null>(null);

  const checkConsent = useCallback(async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (value === 'true') return true;
    } catch {
      // AsyncStorage read failed — treat as no consent (fail-safe)
    }

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setShowConsent(true);
    });
  }, []);

  const handleAllow = useCallback(async () => {
    setShowConsent(false);
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleDecline = useCallback(() => {
    setShowConsent(false);
    showToast({ message: 'AI features require your consent to work.', type: 'info' });
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, [showToast]);

  const ConsentGate = showConsent ? (
    <AIConsentSheet onAllow={handleAllow} onDecline={handleDecline} />
  ) : null;

  return { checkConsent, ConsentGate };
}

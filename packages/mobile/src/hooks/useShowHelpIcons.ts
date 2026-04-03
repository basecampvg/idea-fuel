import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ideafuel_show_help_icons';

export function useShowHelpIcons(): [boolean, (value: boolean) => Promise<void>] {
  const [showHelpIcons, setShowHelpIconsState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value !== null) {
        setShowHelpIconsState(value === 'true');
      }
    });
  }, []);

  const setShowHelpIcons = useCallback(async (value: boolean) => {
    setShowHelpIconsState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  }, []);

  return [showHelpIcons, setShowHelpIcons];
}

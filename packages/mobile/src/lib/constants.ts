import Constants from 'expo-constants';

// API URL - points to Next.js backend
// Use your machine's local IP for physical device testing, localhost for simulators
export const API_URL = __DEV__
  ? 'http://10.0.0.202:3006'
  : (Constants.expoConfig?.extra?.apiUrl || 'https://app.ideafuel.ai');

// Auth configuration
export const AUTH_CONFIG = {
  // Google OAuth
  google: {
    expoClientId: Constants.expoConfig?.extra?.googleExpoClientId,
    iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
    androidClientId: Constants.expoConfig?.extra?.googleAndroidClientId,
    webClientId: Constants.expoConfig?.extra?.googleWebClientId,
  },
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'forge_auth_token',
  USER_DATA: 'forge_user_data',
  REFRESH_TOKEN: 'forge_refresh_token',
} as const;

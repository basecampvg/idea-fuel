import Constants from 'expo-constants';

// API URL - points to Next.js backend
export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

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

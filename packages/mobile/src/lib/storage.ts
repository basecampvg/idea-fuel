import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from './constants';

/**
 * Secure storage wrapper for auth tokens
 */
export const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async deleteToken(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async deleteRefreshToken(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA),
    ]);
  },
};

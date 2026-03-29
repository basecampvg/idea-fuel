import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import { secureStorage } from '../lib/storage';
import { API_URL, AUTH_CONFIG } from '../lib/constants';
import { initPurchases, logOutPurchases } from '../lib/purchases';

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  devSignIn?: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: AUTH_CONFIG.google.webClientId,
    iosClientId: AUTH_CONFIG.google.iosClientId,
    androidClientId: AUTH_CONFIG.google.androidClientId,
  });

  // Exchange Google token for our session token
  const exchangeToken = useCallback(async (googleToken: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${API_URL}/api/auth/mobile/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleToken }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error('Failed to exchange token');
      }

      const data = await res.json();
      await secureStorage.setToken(data.token);
      if (data.refreshToken) {
        await secureStorage.setRefreshToken(data.refreshToken);
      }
      setUser(data.user);
      // Defer RevenueCat init until after navigation animations complete
      // to avoid TurboModule calls during Fabric mount transactions.
      InteractionManager.runAfterInteractions(() => {
        initPurchases(data.user.id).catch(() => {});
      });
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw error;
    }
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      exchangeToken(response.authentication.accessToken).catch((err) => {
        console.error('Google token exchange failed:', err);
        setUser(null);
      });
    }
  }, [response, exchangeToken]);

  // Check for existing session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const token = await secureStorage.getToken();

        if (token) {
          // Validate token with backend (with timeout)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
            const res = await fetch(`${API_URL}/api/auth/mobile/session`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              setUser(data.user);
              // Defer RevenueCat init until after navigation animations complete
              InteractionManager.runAfterInteractions(() => {
                initPurchases(data.user.id).catch(() => {});
              });
            } else {
              // Token invalid, clear storage
              await secureStorage.clearAll();
            }
          } catch {
            clearTimeout(timeoutId);
            // Don't clear storage on network error, just continue without auth
          }
        }
      } catch {
        // Silently handle session load errors
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!request) {
      throw new Error('Google auth not ready');
    }
    await promptAsync();
  }, [request, promptAsync]);

  // Dev-only sign in — bypasses Google OAuth (stripped from production builds)
  const devSignIn = __DEV__
    ? async (email: string) => {
        try {
          const res = await fetch(`${API_URL}/api/auth/mobile/dev-signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Dev sign-in failed');
          }

          const data = await res.json();
          await secureStorage.setToken(data.token);
          setUser(data.user);
          InteractionManager.runAfterInteractions(() => {
            initPurchases(data.user.id).catch(() => {});
          });
        } catch (error) {
          console.error('Dev sign-in failed:', error);
          throw error;
        }
      }
    : undefined;

  const signOut = useCallback(async () => {
    try {
      // Log out of RevenueCat before clearing local state
      await logOutPurchases();

      const token = await secureStorage.getToken();
      if (token) {
        // Notify backend of logout
        await fetch(`${API_URL}/api/auth/mobile/signout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {
          // Ignore errors - we're logging out anyway
        });
      }
    } finally {
      await secureStorage.clearAll();
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const token = await secureStorage.getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/auth/mobile/session`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signInWithGoogle,
        devSignIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

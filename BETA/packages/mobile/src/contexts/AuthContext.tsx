import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { secureStorage } from '../lib/storage';
import { API_URL, AUTH_CONFIG } from '../lib/constants';

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
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: AUTH_CONFIG.google.webClientId,
    iosClientId: AUTH_CONFIG.google.iosClientId,
    androidClientId: AUTH_CONFIG.google.androidClientId,
  });

  // Exchange Google token for our session token
  const exchangeToken = useCallback(async (googleToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/mobile/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleToken }),
      });

      if (!res.ok) {
        throw new Error('Failed to exchange token');
      }

      const data = await res.json();
      await secureStorage.setToken(data.token);
      if (data.refreshToken) {
        await secureStorage.setRefreshToken(data.refreshToken);
      }
      setUser(data.user);
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw error;
    }
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      exchangeToken(response.authentication.accessToken);
    }
  }, [response, exchangeToken]);

  // Check for existing session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const token = await secureStorage.getToken();
        if (token) {
          // Validate token with backend
          const res = await fetch(`${API_URL}/api/auth/mobile/session`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
          } else {
            // Token invalid, clear storage
            await secureStorage.clearAll();
          }
        }
      } catch (error) {
        console.error('Failed to load session:', error);
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

  const signOut = useCallback(async () => {
    try {
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
    }
  }, []);

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

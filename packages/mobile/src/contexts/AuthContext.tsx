import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager, Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
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
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  devSignIn?: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuthError: () => void;
}

// Sleep helper for retry backoff
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  // Dedup: same Google id_token should only be exchanged once per auth flow.
  // `useEffect` on `response` can re-fire on StrictMode double-invoke or re-render.
  const exchangedIdTokenRef = useRef<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // Google OAuth configuration. `openid` scope is required so the provider
  // returns an id_token (JWT with aud/iss/exp claims we verify server-side).
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: AUTH_CONFIG.google.webClientId,
    iosClientId: AUTH_CONFIG.google.iosClientId,
    androidClientId: AUTH_CONFIG.google.androidClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  // Exchange a Google ID token for our session token. ID token (not access
  // token) is required — it carries a verifiable `aud` claim bound to one
  // of our Google OAuth client IDs.
  //
  // Retries transient failures (network errors, 5xx, timeouts) with backoff,
  // since Vercel cold-starts + Google JWKS fetch can take >15s on first hit.
  // Does NOT retry 4xx — those are deterministic (bad/expired token, audience
  // mismatch) and retrying won't help.
  const exchangeToken = useCallback(async (googleIdToken: string) => {
    const MAX_ATTEMPTS = 3;
    const TIMEOUT_MS = 30000;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const res = await fetch(`${API_URL}/api/auth/mobile/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: googleIdToken }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          // Parse the server's error payload so we surface the real reason
          // instead of a generic "Failed to exchange token".
          let serverMessage = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            if (body?.error) serverMessage = String(body.error);
          } catch {
            // Server didn't return JSON — keep the status-code message
          }

          // 4xx is deterministic: bad token, expired token, audience mismatch,
          // unverified email. Retrying won't change the outcome.
          if (res.status >= 400 && res.status < 500) {
            throw new Error(serverMessage);
          }

          // 5xx: retryable
          lastError = new Error(`Server error (${res.status}): ${serverMessage}`);
          if (__DEV__) console.warn(`[auth] exchange attempt ${attempt} failed:`, lastError.message);
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
            continue;
          }
          throw lastError;
        }

        const data = await res.json();
        await secureStorage.setToken(data.token);
        if (data.refreshToken) {
          await secureStorage.setRefreshToken(data.refreshToken);
        }
        setUser(data.user);
        setAuthError(null);
        // Defer RevenueCat init until after navigation animations complete
        // to avoid TurboModule calls during Fabric mount transactions.
        InteractionManager.runAfterInteractions(() => {
          initPurchases(data.user.id).catch(() => {});
        });
        return;
      } catch (error) {
        clearTimeout(timeoutId);
        const err = error as Error;

        // Thrown explicitly from the 4xx path above — don't retry, bubble up.
        if (lastError !== err && !controller.signal.aborted && err.name !== 'AbortError' && err.name !== 'TypeError') {
          throw err;
        }

        // Network error (TypeError), timeout (AbortError), or retryable 5xx: retry
        lastError = err;
        if (__DEV__) console.warn(`[auth] exchange attempt ${attempt} network/timeout:`, err.message);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
          continue;
        }
        throw err;
      }
    }

    throw lastError ?? new Error('Token exchange failed');
  }, []);

  // Handle Google OAuth response. Prefer idToken; expo-auth-session includes
  // it when `openid` scope is requested (default for Google provider).
  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken =
      response.authentication?.idToken ??
      (response.params && typeof response.params.id_token === 'string'
        ? response.params.id_token
        : undefined);
    if (!idToken) {
      setAuthError('Google sign-in did not return an identity token. Try again.');
      return;
    }

    // Dedup: the effect can re-fire for the same `response` object on a
    // StrictMode double-invoke or an unrelated re-render. Exchanging the
    // same token twice doubles the session row on success and can look like
    // a failure if one racing attempt overwrites state after the other.
    if (exchangedIdTokenRef.current === idToken) return;
    exchangedIdTokenRef.current = idToken;

    exchangeToken(idToken).catch((err) => {
      if (__DEV__) console.error('Google token exchange failed:', err);
      setAuthError(err?.message || 'Sign-in failed. Please try again.');
      // Let the user try again — clear the dedup so a fresh OAuth flow can retry
      exchangedIdTokenRef.current = null;
    });
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
    // Clear any stale error from a prior attempt and reset dedup so a
    // new OAuth round can be exchanged even if the prior one failed.
    setAuthError(null);
    exchangedIdTokenRef.current = null;
    await promptAsync();
  }, [request, promptAsync]);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple is only available on iOS');
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sign in with Apple is not available on this device');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_URL}/api/auth/mobile/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          fullName: credential.fullName
            ? {
                givenName: credential.fullName.givenName ?? undefined,
                familyName: credential.fullName.familyName ?? undefined,
              }
            : null,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: 'Apple sign-in failed' }));
        throw new Error(err.error || 'Apple sign-in failed');
      }

      const data = await res.json();
      await secureStorage.setToken(data.token);
      setUser(data.user);
      InteractionManager.runAfterInteractions(() => {
        initPurchases(data.user.id).catch(() => {});
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

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
        authError,
        clearAuthError,
        signInWithGoogle,
        signInWithApple,
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

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { QueryClient } from '@tanstack/react-query';
import { API_URL } from './constants';
import { secureStorage } from './storage';

// Import AppRouter type from server package
// Note: This type is shared via workspace
import type { AppRouter } from '@forge/server';

/**
 * tRPC React client for mobile app
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with auth token header
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        transformer: superjson,
        async headers() {
          const token = await secureStorage.getToken();
          return token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {};
        },
      }),
    ],
  });
}

/**
 * React Query client with mobile-optimized settings
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep in cache for 30 minutes
        gcTime: 30 * 60 * 1000,
        // Retry failed queries 3 times
        retry: 3,
        // Don't refetch on window focus (mobile doesn't have this)
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
      },
    },
  });
}

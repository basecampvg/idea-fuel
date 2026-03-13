import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, schema } from '@forge/server';

/**
 * Auth.js configuration
 * Supports Google SSO with Drizzle adapter for database sessions
 */
export const authConfig: NextAuthConfig = {
  // Our DB uses `id` as PK on Session/Account rather than
  // the adapter's default composite PKs — cast needed for type compatibility.
  // Runtime behavior is identical since the adapter queries by sessionToken/provider.
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions as never,
    verificationTokensTable: schema.verificationTokens,
  }),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Request offline access for refresh tokens
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    // TODO: Add Apple and Facebook providers when ready
    // Apple({...}),
    // Facebook({...}),
  ],

  callbacks: {
    /**
     * Called when session is accessed
     * Add userId to session for use in tRPC context
     */
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },

    /**
     * Called when checking if user is authorized
     * Used for protecting routes
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuth = nextUrl.pathname.startsWith('/auth');

      // All routes that require authentication
      const protectedPrefixes = ['/dashboard', '/projects', '/reports', '/plans', '/daily-pick', '/settings', '/admin'];
      const isProtectedRoute = protectedPrefixes.some((p) => nextUrl.pathname.startsWith(p));

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login
      } else if (isOnAuth) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
      }
      return true;
    },
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },

  // Cookie configuration for cross-subdomain sessions
  // Setting domain to .ideafuel.ai allows sharing session across:
  // - ideafuel.ai (landing)
  // - app.ideafuel.ai (main app)
  // - admin.ideafuel.ai (admin panel)
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? 'next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Set domain for cross-subdomain auth in production
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ideafuel.ai'
            : undefined,
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === 'production'
          ? 'next-auth.callback-url'
          : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ideafuel.ai'
            : undefined,
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
};

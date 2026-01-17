import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@forge/server';

/**
 * Auth.js configuration
 * Supports Google SSO with Prisma adapter for database sessions
 */
export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

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
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnAuth = nextUrl.pathname.startsWith('/auth');

      if (isOnDashboard) {
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

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
};

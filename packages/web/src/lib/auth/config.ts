import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, schema } from '@forge/server';

/**
 * Resolve the cookie domain for cross-subdomain sessions.
 * .trim() is critical — Vercel's env var UI can inject trailing
 * whitespace / newlines that are invisible in logs but cause
 * `option domain is invalid` from the cookie serializer.
 */
const COOKIE_DOMAIN =
  process.env.NODE_ENV === 'production'
    ? (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ideafuel.ai').trim()
    : undefined;

const useSecureCookies = process.env.NODE_ENV === 'production';
const cookiePrefix = useSecureCookies ? '__Secure-' : '';

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
  // Setting domain allows sharing session across:
  // - ideafuel.ai (landing)
  // - app.ideafuel.ai (main app)
  // - admin.ideafuel.ai (admin panel)
  //
  // When secure: true, cookie names MUST use the __Secure- prefix,
  // otherwise browsers silently reject them on HTTPS origins.
  // Auth.js defaults to __Secure-authjs.* when useSecureCookies is true,
  // but since we override cookies we must set the prefix ourselves.
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: COOKIE_DOMAIN,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: COOKIE_DOMAIN,
      },
    },
    csrfToken: {
      // CSRF token uses __Host- prefix (stricter: no Domain allowed, path must be /)
      name: `${useSecureCookies ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        // __Host- cookies MUST NOT have a Domain attribute
      },
    },
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
};

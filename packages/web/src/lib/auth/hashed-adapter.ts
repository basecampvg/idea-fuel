import type { Adapter } from 'next-auth/adapters';
import { hashSessionToken } from '@forge/server';

/**
 * Wraps an auth.js Adapter so session-token inputs are HMAC-hashed before
 * hitting the database. The cookie the user holds stays plaintext; the DB
 * only ever sees/stores the hash. A DB dump is useless without AUTH_SECRET.
 *
 * Account/User/VerificationToken methods are passed through unchanged.
 */
export function withHashedSessions(adapter: Adapter): Adapter {
  return {
    ...adapter,
    async createSession(session) {
      return adapter.createSession!({
        ...session,
        sessionToken: hashSessionToken(session.sessionToken),
      });
    },
    async getSessionAndUser(sessionToken) {
      return adapter.getSessionAndUser!(hashSessionToken(sessionToken));
    },
    async updateSession(session) {
      return adapter.updateSession!({
        ...session,
        sessionToken: hashSessionToken(session.sessionToken),
      });
    },
    deleteSession(sessionToken) {
      return adapter.deleteSession!(hashSessionToken(sessionToken));
    },
  };
}

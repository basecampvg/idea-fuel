import { createHmac } from 'crypto';

/**
 * HMAC-SHA256 hash of a session token. Storing the hash in the DB instead
 * of the raw token means a DB dump doesn't give an attacker working session
 * tokens — they also need AUTH_SECRET.
 *
 * Output is lowercase hex (64 chars). The Session.sessionToken column stays
 * `text`, so column capacity is unchanged.
 */
export function hashSessionToken(token: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is required to hash session tokens');
  }
  return createHmac('sha256', secret).update(token).digest('hex');
}

import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();

/**
 * Allowed Google OAuth client IDs. An ID token's `aud` claim must match
 * exactly one of these — otherwise the token was issued to a different
 * app and should not authenticate a user here.
 *
 * Reads from env with fallbacks to the hardcoded IDs from app.json (these
 * are public values, not secrets).
 */
function getAllowedAudiences(): string[] {
  const web =
    process.env.GOOGLE_WEB_CLIENT_ID ||
    '117953471324-40im20410td9hoan1drsgj2sfpj797lu.apps.googleusercontent.com';
  const ios =
    process.env.GOOGLE_IOS_CLIENT_ID ||
    '117953471324-n6ufvodls46kvk9ekagd3jfoagbnn7aj.apps.googleusercontent.com';
  const android = process.env.GOOGLE_ANDROID_CLIENT_ID;

  return [web, ios, android].filter((s): s is string => !!s && s.length > 0);
}

export interface VerifiedGoogleIdToken {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/**
 * Verify a Google ID token (JWT).
 *
 * Checks:
 *  - RSA signature against Google's published JWKS
 *  - `iss` is accounts.google.com
 *  - `aud` matches one of our configured client IDs
 *  - `exp` is in the future
 *
 * Throws if any check fails. Returns the verified subject claims on success.
 */
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<VerifiedGoogleIdToken> {
  const audiences = getAllowedAudiences();
  if (audiences.length === 0) {
    throw new Error('No Google OAuth client IDs configured — refusing to verify ID tokens');
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: audiences,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Google ID token payload missing');
  }

  if (!payload.sub) {
    throw new Error('Google ID token missing sub claim');
  }
  if (!payload.email) {
    throw new Error('Google ID token missing email claim');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}

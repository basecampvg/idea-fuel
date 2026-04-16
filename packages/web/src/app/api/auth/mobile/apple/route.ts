import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@forge/server';
import { eq, and } from 'drizzle-orm';
import { randomBytes, createPublicKey, verify as verifySignature } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/mobile/apple
 *
 * Exchange an Apple Sign In identity token for an IdeaFuel session.
 *
 * Request body:
 *   {
 *     identityToken: string,  // The JWT from expo-apple-authentication
 *     fullName?: { givenName?: string; familyName?: string } | null,
 *   }
 *
 * The identity token is a JWT signed by Apple. We verify:
 *   - Signature (RSA against Apple's published JWKS)
 *   - iss === 'https://appleid.apple.com'
 *   - aud === our iOS bundle identifier
 *   - exp in the future
 *   - email_verified (when provided; Apple relay emails are verified by default)
 *
 * Apple only returns fullName on the FIRST sign-in; subsequent sign-ins
 * return only the identity token. The mobile client forwards fullName
 * when available so we can populate the user's name on initial signup.
 *
 * Apple relay emails (user@privaterelay.appleid.com) are treated as the
 * user's email. If the user disables email relay later, Apple will keep
 * forwarding to the original email; we just see the relay as the user's
 * identifier.
 */

type JwkRsa = {
  kty: 'RSA';
  kid: string;
  use: 'sig';
  alg: 'RS256';
  n: string;
  e: string;
};

type AppleIdTokenPayload = {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string; // Apple's stable user id
  email?: string;
  email_verified?: boolean | 'true' | 'false';
  is_private_email?: boolean | 'true' | 'false';
};

const APPLE_ISS = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

// Apps must declare which audiences (client IDs / bundle IDs) are valid.
// For mobile: the iOS bundle identifier from app.json.
const APPLE_AUDIENCES = [
  process.env.APPLE_CLIENT_ID, // Services ID, web flow (optional)
  process.env.APPLE_IOS_CLIENT_ID, // Bundle ID, mobile flow
  'com.ideafuel.mobile', // Fallback matches current app.json
].filter(Boolean) as string[];

// JWKS cache — Apple rotates keys infrequently; cache ~1 hour.
let cachedJwks: { keys: JwkRsa[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

async function getAppleJwks(): Promise<JwkRsa[]> {
  const now = Date.now();
  if (cachedJwks && now - cachedJwks.fetchedAt < JWKS_TTL_MS) {
    return cachedJwks.keys;
  }
  const res = await fetch(APPLE_JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Apple JWKS: ${res.status}`);
  }
  const json = (await res.json()) as { keys: JwkRsa[] };
  cachedJwks = { keys: json.keys, fetchedAt: now };
  return json.keys;
}

function b64urlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

async function verifyAppleIdToken(
  idToken: string,
): Promise<AppleIdTokenPayload> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed identity token');
  }
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(b64urlDecode(headerB64).toString()) as {
    alg: string;
    kid: string;
  };
  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported alg: ${header.alg}`);
  }

  const payload = JSON.parse(
    b64urlDecode(payloadB64).toString(),
  ) as AppleIdTokenPayload;

  const keys = await getAppleJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    throw new Error(`Unknown Apple key id: ${header.kid}`);
  }

  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const data = Buffer.from(`${headerB64}.${payloadB64}`);
  const signature = b64urlDecode(sigB64);

  const ok = verifySignature('RSA-SHA256', data, publicKey, signature);
  if (!ok) {
    throw new Error('Invalid identity token signature');
  }

  if (payload.iss !== APPLE_ISS) {
    throw new Error(`Invalid iss: ${payload.iss}`);
  }
  if (!APPLE_AUDIENCES.includes(payload.aud)) {
    throw new Error(`Invalid aud: ${payload.aud}`);
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < nowSec) {
    throw new Error('Identity token expired');
  }
  // Apple emails are always verified (relay emails are verified by default).
  // Accept both boolean and string representations per Apple's spec.
  const emailVerified =
    payload.email_verified === true || payload.email_verified === 'true';
  if (payload.email && !emailVerified) {
    throw new Error('Apple email is not verified');
  }

  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      identityToken?: string;
      fullName?: { givenName?: string; familyName?: string } | null;
    };

    if (!body.identityToken) {
      return NextResponse.json(
        { error: 'Missing identityToken' },
        { status: 400 },
      );
    }

    const claims = await verifyAppleIdToken(body.identityToken);

    // Compose a display name from the first-sign-in payload. Apple only
    // returns this once; ignore on subsequent sign-ins where it's absent.
    const displayName = body.fullName
      ? [body.fullName.givenName, body.fullName.familyName]
          .filter(Boolean)
          .join(' ')
          .trim() || null
      : null;

    // Apple doesn't always include email (only on first sign-in with the
    // `email` scope OR when re-consenting). We need an email to match our
    // existing User records which key off email. If email is missing,
    // fall through to matching by Apple `sub` via the Account table.
    let user:
      | typeof schema.users.$inferSelect
      | undefined;

    if (claims.email) {
      user = await db.query.users.findFirst({
        where: eq(schema.users.email, claims.email),
      });
    }

    // If we didn't find a user by email, try by Apple account linkage.
    if (!user) {
      const appleAccount = await db.query.accounts.findFirst({
        where: and(
          eq(schema.accounts.provider, 'apple'),
          eq(schema.accounts.providerAccountId, claims.sub),
        ),
      });
      if (appleAccount) {
        user = await db.query.users.findFirst({
          where: eq(schema.users.id, appleAccount.userId),
        });
      }
    }

    if (!user) {
      // New user — must have an email at this point.
      if (!claims.email) {
        return NextResponse.json(
          {
            error:
              'Apple did not return an email. Re-sign-in from Settings > Sign in with Apple in iOS and re-grant email permission.',
          },
          { status: 400 },
        );
      }
      const [created] = await db
        .insert(schema.users)
        .values({
          email: claims.email,
          name: displayName,
          image: null,
          updatedAt: new Date(),
        })
        .returning();
      user = created;
    } else if (displayName && !user.name) {
      // Populate name on first-sign-in payload if we didn't have one.
      const [updated] = await db
        .update(schema.users)
        .set({ name: displayName })
        .where(eq(schema.users.id, user.id))
        .returning();
      user = updated;
    }

    // Ensure Account linkage exists for this Apple sub.
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(schema.accounts.userId, user.id),
        eq(schema.accounts.provider, 'apple'),
      ),
    });

    if (!existingAccount) {
      await db.insert(schema.accounts).values({
        userId: user.id,
        type: 'oauth',
        provider: 'apple',
        providerAccountId: claims.sub,
        id_token: body.identityToken,
      });
    } else {
      await db
        .update(schema.accounts)
        .set({ id_token: body.identityToken })
        .where(eq(schema.accounts.id, existingAccount.id));
    }

    // Mint a 30-day session token. Same format as the Google mobile flow.
    const sessionToken = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(schema.sessions).values({
      sessionToken,
      userId: user.id,
      expires,
    });

    return NextResponse.json({
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });
  } catch (err) {
    console.error('[api/auth/mobile/apple] failed:', err);
    const message =
      err instanceof Error ? err.message : 'Apple sign-in failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db, schema, hashSessionToken, verifyGoogleIdToken } from '@forge/server';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/mobile/google
 * Exchange a Google ID token for an IdeaFuel session token.
 *
 * Called by the mobile app after successful Google OAuth. Verifies the
 * ID token's signature + audience + expiry against Google's JWKS, then
 * creates/updates the user and returns a session token.
 *
 * Prior versions accepted a raw access_token and called /userinfo, which
 * trusted any Google access token regardless of which app requested it.
 * ID token verification binds the sign-in to our specific client IDs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken: string | undefined = body.idToken ?? body.token;

    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing Google ID token' },
        { status: 400 }
      );
    }

    // Verify signature, audience, issuer, expiry
    let googleUser;
    try {
      googleUser = await verifyGoogleIdToken(idToken);
    } catch (err) {
      console.error('[mobile/google] ID token verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid Google ID token' },
        { status: 401 }
      );
    }

    if (!googleUser.emailVerified) {
      return NextResponse.json(
        { error: 'Google account email not verified' },
        { status: 401 }
      );
    }

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, googleUser.email),
    });

    if (!user) {
      // Create new user
      const [newUser] = await db
        .insert(schema.users)
        .values({
          email: googleUser.email,
          name: googleUser.name,
          image: googleUser.picture,
          updatedAt: new Date(),
        })
        .returning();
      user = newUser;
    } else {
      // Update user info if changed
      if (user.name !== googleUser.name || user.image !== googleUser.picture) {
        const [updatedUser] = await db
          .update(schema.users)
          .set({
            name: googleUser.name || user.name,
            image: googleUser.picture || user.image,
          })
          .where(eq(schema.users.id, user.id))
          .returning();
        user = updatedUser;
      }
    }

    // Create or update Google account link
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(schema.accounts.userId, user.id),
        eq(schema.accounts.provider, 'google'),
      ),
    });

    if (!existingAccount) {
      await db.insert(schema.accounts).values({
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: googleUser.sub,
        id_token: idToken,
      });
    } else {
      await db
        .update(schema.accounts)
        .set({ id_token: idToken })
        .where(eq(schema.accounts.id, existingAccount.id));
    }

    // Generate a session token for mobile. Raw token goes to the client;
    // the DB only ever stores the HMAC hash so a DB dump can't be replayed.
    const sessionToken = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session in database (token hashed for storage)
    await db.insert(schema.sessions).values({
      sessionToken: hashSessionToken(sessionToken),
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
  } catch (error) {
    console.error('Mobile Google auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

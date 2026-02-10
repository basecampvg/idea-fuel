import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@forge/server';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/mobile/google
 * Exchange a Google OAuth access token for a session token
 *
 * This endpoint is called by the mobile app after successful Google OAuth.
 * It verifies the Google token, creates/updates the user, and returns a session token.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Missing Google token' },
        { status: 400 }
      );
    }

    // Verify the Google token by fetching user info
    const googleUserInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!googleUserInfoResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401 }
      );
    }

    const googleUser = await googleUserInfoResponse.json();

    if (!googleUser.email) {
      return NextResponse.json(
        { error: 'Email not available from Google' },
        { status: 400 }
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
          name: googleUser.name || null,
          image: googleUser.picture || null,
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
        access_token: token,
      });
    } else {
      await db
        .update(schema.accounts)
        .set({ access_token: token })
        .where(eq(schema.accounts.id, existingAccount.id));
    }

    // Generate a session token for mobile
    const sessionToken = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session in database
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
  } catch (error) {
    console.error('Mobile Google auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

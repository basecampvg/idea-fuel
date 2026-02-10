import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/mobile/dev-login
 * Development-only endpoint to bypass OAuth and create a test session
 *
 * WARNING: Only for development use!
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Dev login not available in production' },
      { status: 403 }
    );
  }

  try {
    const { email = 'dev@forge.local' } = await request.json().catch(() => ({}));

    // Find or create dev user
    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      const [newUser] = await db
        .insert(schema.users)
        .values({
          email,
          name: 'Dev User',
          image: null,
          updatedAt: new Date(),
        })
        .returning();
      user = newUser;
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session
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
    console.error('Dev login error:', error);
    return NextResponse.json(
      { error: 'Dev login failed' },
      { status: 500 }
    );
  }
}

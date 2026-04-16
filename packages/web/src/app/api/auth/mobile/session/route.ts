import { NextRequest, NextResponse } from 'next/server';
import { db, schema, hashSessionToken } from '@forge/server';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/mobile/session
 * Validate a session token and return user info
 *
 * This endpoint is called by the mobile app on startup to validate the stored token.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const sessionToken = authHeader.replace('Bearer ', '');
    const hashedToken = hashSessionToken(sessionToken);

    // Find session with user (look up by HMAC hash, not raw token)
    const session = await db.query.sessions.findFirst({
      where: eq(schema.sessions.sessionToken, hashedToken),
      with: { user: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401 }
      );
    }

    // Check if session has expired
    if (session.expires < new Date()) {
      // Delete expired session
      await db
        .delete(schema.sessions)
        .where(eq(schema.sessions.sessionToken, hashedToken));

      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      },
    });
  } catch (error) {
    console.error('Mobile session validation error:', error);
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    );
  }
}

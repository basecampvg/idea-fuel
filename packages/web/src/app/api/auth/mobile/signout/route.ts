import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';

/**
 * POST /api/auth/mobile/signout
 * Sign out a mobile user by deleting their session
 *
 * This endpoint is called by the mobile app when the user signs out.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, nothing to do
      return NextResponse.json({ success: true });
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // Delete the session
    await db
      .delete(schema.sessions)
      .where(eq(schema.sessions.sessionToken, sessionToken))
      .catch(() => {
        // Session may not exist, that's fine
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mobile signout error:', error);
    // Return success anyway - user is signing out
    return NextResponse.json({ success: true });
  }
}

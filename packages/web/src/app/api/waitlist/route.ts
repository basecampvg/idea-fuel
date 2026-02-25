import { NextResponse } from 'next/server';
import { db, schema } from '@forge/server';
import { eq, count } from 'drizzle-orm';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter: max 5 requests per IP per hour
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function getClientIp(hdrs: Headers): string {
  return (
    hdrs.get('x-forwarded-for')?.split(',')[0].trim() ||
    hdrs.get('x-real-ip') ||
    hdrs.get('x-vercel-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

/**
 * POST /api/waitlist
 * Captures email for landing page waitlist, syncs to Beehiiv
 */
export async function POST(request: Request) {
  try {
    const hdrs = await headers();
    const clientIp = getClientIp(hdrs);

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, source = 'landing', metadata } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Store in database (upsert to handle duplicates)
    const [emailCapture] = await db
      .insert(schema.emailCaptures)
      .values({
        email: normalizedEmail,
        source,
        metadata: metadata || null,
        beehiivSynced: false,
      })
      .onConflictDoUpdate({
        target: schema.emailCaptures.email,
        set: {
          source,
          metadata: metadata || undefined,
        },
      })
      .returning();

    // Sync to Beehiiv if configured
    let beehiivSynced = false;
    const beehiivApiKey = process.env.BEEHIIV_API_KEY;
    const beehiivPublicationId = process.env.BEEHIIV_PUBLICATION_ID;

    if (beehiivApiKey && beehiivPublicationId) {
      try {
        const beehiivResponse = await fetch(
          `https://api.beehiiv.com/v2/publications/${beehiivPublicationId}/subscriptions`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${beehiivApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: normalizedEmail,
              reactivate_existing: true,
              send_welcome_email: true,
              utm_source: source,
              referring_site: metadata?.referrer || undefined,
            }),
          }
        );

        if (beehiivResponse.ok) {
          beehiivSynced = true;

          // Update database record
          await db
            .update(schema.emailCaptures)
            .set({ beehiivSynced: true })
            .where(eq(schema.emailCaptures.id, emailCapture.id));
        } else {
          // Log error but don't fail the request
          const errorText = await beehiivResponse.text();
          console.error('[Beehiiv Sync Error]', beehiivResponse.status, errorText);
        }
      } catch (beehiivError) {
        // Log error but don't fail the request
        console.error('[Beehiiv Sync Error]', beehiivError);
      }
    }

    return NextResponse.json({
      success: true,
      beehiivSynced,
      message: 'Successfully joined the waitlist!',
    });
  } catch (error) {
    console.error('[Waitlist Error]', error);

    // Handle unique constraint error (duplicate email)
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint failed')
    ) {
      return NextResponse.json({
        success: true,
        message: 'You\'re already on the waitlist!',
      });
    }

    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/waitlist/count
 * Returns count of waitlist signups (for admin/display)
 */
export async function GET() {
  try {
    const [result] = await db.select({ value: count() }).from(schema.emailCaptures);

    return NextResponse.json({ count: result.value });
  } catch (error) {
    console.error('[Waitlist Count Error]', error);
    return NextResponse.json({ count: 0 });
  }
}

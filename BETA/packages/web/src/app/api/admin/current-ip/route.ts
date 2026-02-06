import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/admin/current-ip
 * Returns the current user's IP address for self-whitelisting
 */
export async function GET(request: Request) {
  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const vercelIP = request.headers.get('x-vercel-forwarded-for');

  // Parse the first IP from x-forwarded-for (can be comma-separated)
  const clientIP =
    (forwarded?.split(',')[0]?.trim()) ||
    realIP?.trim() ||
    (vercelIP?.split(',')[0]?.trim()) ||
    'unknown';

  return NextResponse.json({
    ip: clientIP,
    headers: {
      'x-forwarded-for': forwarded,
      'x-real-ip': realIP,
      'x-vercel-forwarded-for': vercelIP,
    },
  });
}

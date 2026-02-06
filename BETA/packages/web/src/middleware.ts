import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Subdomain routing middleware for IdeationLab
 *
 * Routes:
 * - ideationlab.ai (root) → Landing page
 * - app.ideationlab.ai → Main application dashboard
 * - admin.ideationlab.ai → Admin panel (IP whitelist + role check)
 */

// IP whitelist for admin subdomain (comma-separated in env)
const ADMIN_IP_WHITELIST = (process.env.ADMIN_IP_WHITELIST || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

// Root domain for production
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ideationlab.ai';

/**
 * Extract subdomain from host header
 */
function getSubdomain(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0];

  // Handle localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null; // Treat as root domain in dev
  }

  // Handle *.local for local testing with hosts file
  if (hostname.endsWith('.local')) {
    const parts = hostname.replace('.local', '').split('.');
    if (parts.length > 1) {
      return parts[0]; // e.g., "admin" from "admin.ideationlab.local"
    }
    return null;
  }

  // Production subdomain detection
  const parts = hostname.split('.');
  if (parts.length > 2) {
    // Has subdomain (e.g., app.ideationlab.ai)
    return parts[0];
  }

  return null; // Root domain
}

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  // Check common proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Vercel specific
  const vercelIP = request.headers.get('x-vercel-forwarded-for');
  if (vercelIP) {
    return vercelIP.split(',')[0].trim();
  }

  return 'unknown';
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const subdomain = getSubdomain(host);

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // =========================================================================
  // ADMIN SUBDOMAIN (admin.ideationlab.ai)
  // =========================================================================
  if (subdomain === 'admin') {
    // 1. IP Whitelist Check (if configured)
    if (ADMIN_IP_WHITELIST.length > 0) {
      const clientIP = getClientIP(request);

      if (!ADMIN_IP_WHITELIST.includes(clientIP)) {
        // Log blocked attempt for security monitoring
        console.warn(
          `[Admin Access Blocked] IP: ${clientIP} attempted to access admin subdomain`
        );

        return new NextResponse(
          JSON.stringify({
            error: 'Access denied',
            message: 'Your IP address is not authorized to access this resource.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 2. Rewrite to admin routes
    // Admin role check happens in the admin layout (server-side)
    if (pathname === '/') {
      // Redirect admin root to admin dashboard
      return NextResponse.rewrite(new URL('/admin', request.url));
    }

    // Rewrite /anything to /admin/anything for admin subdomain
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/auth')) {
      return NextResponse.rewrite(new URL(`/admin${pathname}`, request.url));
    }

    return NextResponse.next();
  }

  // =========================================================================
  // APP SUBDOMAIN (app.ideationlab.ai)
  // =========================================================================
  if (subdomain === 'app') {
    // Redirect root to dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Auth routes and dashboard routes work as normal
    return NextResponse.next();
  }

  // =========================================================================
  // ROOT DOMAIN (ideationlab.ai) - Landing Page
  // =========================================================================
  if (!subdomain) {
    // Allow public paths
    const publicPaths = ['/', '/blog', '/auth', '/api'];
    const isPublicPath = publicPaths.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    );

    if (isPublicPath) {
      return NextResponse.next();
    }

    // Redirect app routes to app subdomain in production
    const appRoutes = ['/dashboard', '/ideas', '/reports', '/settings', '/plans', '/daily-pick'];
    const isAppRoute = appRoutes.some(
      (r) => pathname === r || pathname.startsWith(r + '/')
    );

    if (isAppRoute && process.env.NODE_ENV === 'production') {
      const appUrl = `https://app.${ROOT_DOMAIN}${pathname}${request.nextUrl.search}`;
      return NextResponse.redirect(new URL(appUrl));
    }

    // In development, allow all routes on root domain
    return NextResponse.next();
  }

  // Unknown subdomain - redirect to root
  return NextResponse.redirect(new URL(`https://${ROOT_DOMAIN}`, request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

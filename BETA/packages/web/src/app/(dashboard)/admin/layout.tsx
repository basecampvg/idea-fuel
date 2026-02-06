import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@forge/server';
import { AdminLayoutClient } from './admin-layout-client';

/**
 * Admin Layout - Server Component
 * Handles authentication and role-based access control
 *
 * Access Requirements:
 * 1. User must be authenticated
 * 2. User must have ADMIN or SUPER_ADMIN role (or legacy isAdmin flag)
 * 3. IP whitelist is checked in middleware.ts
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/admin');
  }

  // Check user role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      isAdmin: true,
      email: true,
    },
  });

  if (!user) {
    redirect('/auth/signin?error=UserNotFound');
  }

  // Check if user has admin access
  // Support both new role system and legacy isAdmin flag
  const hasAdminAccess =
    user.isAdmin === true ||
    user.role === 'ADMIN' ||
    user.role === 'SUPER_ADMIN';

  if (!hasAdminAccess) {
    // Log unauthorized access attempt
    console.warn(
      `[Admin Access Denied] User ${user.email} (role: ${user.role}) attempted to access admin panel`
    );

    // Redirect to dashboard with error
    redirect('/dashboard?error=unauthorized');
  }

  // User has access - render admin layout
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

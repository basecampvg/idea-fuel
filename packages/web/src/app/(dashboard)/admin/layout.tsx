import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';
import { AdminLayoutClient } from './admin-layout-client';

/**
 * Admin Layout - Server Component
 * Handles authentication and role-based access control
 *
 * Access Requirements:
 * 1. User must be authenticated
 * 2. User must have SUPER_ADMIN role
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
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
    columns: {
      role: true,
      isAdmin: true,
      email: true,
    },
  });

  if (!user) {
    redirect('/auth/signin?error=UserNotFound');
  }

  // Check if user has super admin access
  const hasAdminAccess = user.role === 'SUPER_ADMIN';

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

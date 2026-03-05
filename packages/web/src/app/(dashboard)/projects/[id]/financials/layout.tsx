import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';

/**
 * Financials Layout — Server Component
 * Gates all /projects/[id]/financials/* routes behind SUPER_ADMIN role.
 * Remove this layout when financials is ready for general access.
 */
export default async function FinancialsGateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
    columns: { role: true },
  });

  if (user?.role !== 'SUPER_ADMIN') {
    const { id } = await params;
    redirect(`/projects/${id}`);
  }

  return <>{children}</>;
}

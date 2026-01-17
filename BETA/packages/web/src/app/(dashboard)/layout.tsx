import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';

// DEV BYPASS: Skip auth check in development
const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session && !DEV_BYPASS_AUTH) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen animated-gradient gradient-glow">
      <Sidebar />
      {/* Main content is truly centered in viewport, sidebar overlays */}
      <main className="min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}

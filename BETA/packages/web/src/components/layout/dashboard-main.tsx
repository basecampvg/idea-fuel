'use client';

import { usePathname } from 'next/navigation';
import { useSidebar } from './sidebar-context';

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { sidebarWidth } = useSidebar();
  const pathname = usePathname();

  // Admin routes render their own layout — no margin needed
  const isAdmin = pathname?.startsWith('/admin');
  if (isAdmin) {
    return (
      <main className="min-h-screen flex flex-col relative z-10">
        {children}
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col relative z-10 transition-[margin-left] duration-200 ease-out"
      style={{ marginLeft: sidebarWidth }}
    >
      {children}
    </main>
  );
}

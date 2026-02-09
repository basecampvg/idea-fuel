'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

export function ConditionalSidebar() {
  const pathname = usePathname();

  // Don't render the main sidebar on admin routes (admin has its own sidebar)
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <Sidebar />;
}

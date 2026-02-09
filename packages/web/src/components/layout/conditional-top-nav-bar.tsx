'use client';

import { usePathname } from 'next/navigation';
import { TopNavBar } from './top-nav-bar';

export function ConditionalTopNavBar() {
  const pathname = usePathname();

  // Don't render the top nav bar on admin routes (admin has its own layout)
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <TopNavBar />;
}

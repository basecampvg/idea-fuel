'use client';

import type { ReactNode } from 'react';
import { SubscriptionProvider } from '@/components/subscription/subscription-context';
import { UpgradeModalContainer } from '@/components/subscription/upgrade-modal';
import { SidebarProvider } from '@/components/layout/sidebar-context';

interface DashboardProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers for the dashboard layout.
 * Wraps children with subscription context and global upgrade modal.
 */
export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <SidebarProvider>
      <SubscriptionProvider>
        {children}
        <UpgradeModalContainer />
      </SubscriptionProvider>
    </SidebarProvider>
  );
}

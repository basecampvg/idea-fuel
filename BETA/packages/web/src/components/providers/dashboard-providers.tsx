'use client';

import type { ReactNode } from 'react';
import { SubscriptionProvider } from '@/components/subscription/subscription-context';
import { UpgradeModalContainer } from '@/components/subscription/upgrade-modal';

interface DashboardProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers for the dashboard layout.
 * Wraps children with subscription context and global upgrade modal.
 */
export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <SubscriptionProvider>
      {children}
      <UpgradeModalContainer />
    </SubscriptionProvider>
  );
}

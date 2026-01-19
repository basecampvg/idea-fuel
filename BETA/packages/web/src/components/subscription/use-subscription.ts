'use client';

import { useSubscriptionContext } from './subscription-context';

/**
 * Hook to access subscription state and controls.
 * Must be used within a SubscriptionProvider.
 *
 * @example
 * ```tsx
 * const { tier, canAccessMode, showUpgradePrompt } = useSubscription();
 *
 * const handleInDepthClick = () => {
 *   if (!canAccessMode('IN_DEPTH')) {
 *     showUpgradePrompt({ type: 'interview_mode', mode: 'IN_DEPTH' });
 *     return;
 *   }
 *   // proceed with IN_DEPTH interview
 * };
 * ```
 */
export function useSubscription() {
  return useSubscriptionContext();
}

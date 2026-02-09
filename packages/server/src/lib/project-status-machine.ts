import type { ProjectStatus } from '@forge/shared';

/**
 * Valid project status transitions.
 * Enforces the lifecycle: CAPTURED → INTERVIEWING → RESEARCHING → COMPLETE
 * With allowed resets back to CAPTURED on failure/abandonment.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  CAPTURED: ['INTERVIEWING', 'RESEARCHING'],    // Can start interview or skip to research (SPARK)
  INTERVIEWING: ['CAPTURED', 'RESEARCHING'],    // Can abandon (→CAPTURED) or start research
  RESEARCHING: ['CAPTURED', 'COMPLETE'],         // Can fail (→CAPTURED) or complete
  COMPLETE: ['RESEARCHING'],                     // Can re-run research
};

/**
 * Check if a project status transition is valid.
 */
export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Assert a project status transition is valid.
 * Throws if the transition is not allowed.
 */
export function assertValidTransition(from: string, to: string): void {
  if (!isValidTransition(from, to)) {
    throw new Error(`Invalid project status transition: ${from} → ${to}`);
  }
}

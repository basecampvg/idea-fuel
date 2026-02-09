/**
 * Project status display configuration.
 * Used by sidebar, mini cards, secondary nav, etc.
 *
 * Unified lifecycle:
 *   CAPTURED     → Draft (not yet researched)
 *   INTERVIEWING → Active (interview in progress)
 *   RESEARCHING  → Active (research pipeline running)
 *   COMPLETE     → Complete (research finished)
 */
import type { ProjectStatus, ProjectDisplayStatus } from '@forge/shared';
export type { ProjectStatus, ProjectDisplayStatus };

export interface ProjectStatusConfig {
  label: string;
  displayStatus: ProjectDisplayStatus;
  color: string;
  badgeClass: string;
}

export const projectStatusConfig: Record<ProjectStatus, ProjectStatusConfig> = {
  CAPTURED: {
    label: 'Draft',
    displayStatus: 'Draft',
    color: 'text-muted-foreground',
    badgeClass: 'bg-muted-foreground/20 text-muted-foreground',
  },
  INTERVIEWING: {
    label: 'Forging',
    displayStatus: 'Active',
    color: 'text-primary',
    badgeClass: 'bg-primary/20 text-primary',
  },
  RESEARCHING: {
    label: 'Researching',
    displayStatus: 'Active',
    color: 'text-info',
    badgeClass: 'bg-primary/30 text-primary',
  },
  COMPLETE: {
    label: 'Ready',
    displayStatus: 'Complete',
    color: 'text-primary',
    badgeClass: 'bg-primary/20 text-primary',
  },
};

/** Get the display status group for sidebar section grouping */
export function getDisplayStatus(status: string): ProjectDisplayStatus {
  const config = projectStatusConfig[status as ProjectStatus];
  return config?.displayStatus ?? 'Draft';
}

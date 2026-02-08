/**
 * Shared project status type and display configuration.
 * Single source of truth — used by sidebar, mini cards, secondary nav, etc.
 *
 * Unified lifecycle:
 *   CAPTURED     → Draft (not yet researched)
 *   INTERVIEWING → Active (interview in progress)
 *   RESEARCHING  → Active (research pipeline running)
 *   COMPLETE     → Complete (research finished)
 */

export type ProjectStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

/** Display group for sidebar sections */
export type ProjectDisplayStatus = 'Draft' | 'Active' | 'Complete';

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

/**
 * Derive display status from a project.
 * Since the Idea model is merged into Project, the project has `status` directly.
 * Maps CAPTURED/INTERVIEWING/RESEARCHING/COMPLETE to DRAFT/ACTIVE/COMPLETE.
 */
export function deriveProjectStatus(
  project: { status: string }
): ProjectDisplayStatus {
  return getDisplayStatus(project.status);
}

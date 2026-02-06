/**
 * Shared project status type and display configuration.
 * Single source of truth — used by sidebar, mini cards, secondary nav, etc.
 */

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETE';

export interface ProjectStatusConfig {
  label: string;
  color: string;
  badgeClass: string;
}

export const projectStatusConfig: Record<ProjectStatus, ProjectStatusConfig> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-muted-foreground',
    badgeClass: 'bg-muted-foreground/20 text-muted-foreground',
  },
  ACTIVE: {
    label: 'Active',
    color: 'text-primary',
    badgeClass: 'bg-primary/20 text-primary',
  },
  COMPLETE: {
    label: 'Complete',
    color: 'text-primary',
    badgeClass: 'bg-primary/20 text-primary',
  },
};

/**
 * Derive project status from its ideas.
 * A project with no ideas is DRAFT.
 * A project with a COMPLETE idea is COMPLETE.
 * Otherwise it's ACTIVE.
 */
export function deriveProjectStatus(project: {
  ideas?: { status: string }[];
}): ProjectStatus {
  const ideas = project.ideas ?? [];
  if (ideas.length === 0) return 'DRAFT';
  const idea = ideas[0];
  if (idea.status === 'COMPLETE') return 'COMPLETE';
  return 'ACTIVE';
}

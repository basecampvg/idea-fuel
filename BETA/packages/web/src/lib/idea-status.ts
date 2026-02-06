/**
 * Shared idea status type and display configuration.
 * Single source of truth — used by sidebar, mini cards, secondary nav, etc.
 */

export type IdeaStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

export interface IdeaStatusConfig {
  label: string;
  color: string;
  badgeClass: string;
}

export const ideaStatusConfig: Record<IdeaStatus, IdeaStatusConfig> = {
  CAPTURED: {
    label: 'Draft',
    color: 'text-muted-foreground',
    badgeClass: 'bg-muted-foreground/20 text-muted-foreground',
  },
  INTERVIEWING: {
    label: 'Forging',
    color: 'text-primary',
    badgeClass: 'bg-primary/20 text-primary',
  },
  RESEARCHING: {
    label: 'Researching',
    color: 'text-info',
    badgeClass: 'bg-primary/30 text-primary',
  },
  COMPLETE: {
    label: 'Ready',
    color: 'text-primary',
    badgeClass: 'bg-primary/20 text-primary',
  },
};

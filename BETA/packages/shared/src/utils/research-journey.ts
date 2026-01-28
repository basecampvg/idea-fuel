/**
 * Research Journey State Detection
 *
 * Determines the user's current position in the progressive research journey:
 * - CAPTURED: Idea saved but no research started
 * - SPARK_COMPLETE: Quick validation done
 * - LIGHT_COMPLETE: Light interview + research complete
 * - FORGE_COMPLETE: Full IN_DEPTH interview + research + reports complete
 */

import type {
  IdeaStatus,
  InterviewMode,
  InterviewStatus,
  SparkJobStatus,
  ResearchStatus,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export type JourneyState =
  | 'CAPTURED'        // No research started
  | 'SPARK_COMPLETE'  // Quick validation complete
  | 'LIGHT_COMPLETE'  // Light mode complete
  | 'FORGE_COMPLETE'; // Full analysis complete (hide banner)

export interface ResearchStateInput {
  idea: {
    status: IdeaStatus;
  };
  interview?: {
    mode: InterviewMode;
    status: InterviewStatus;
  } | null;
  research?: {
    sparkStatus?: SparkJobStatus | null;
    sparkResult?: unknown | null;
    status: ResearchStatus;
  } | null;
}

// =============================================================================
// JOURNEY STATE DETECTION
// =============================================================================

/**
 * Determines the user's current position in the research journey.
 *
 * Logic:
 * 1. CAPTURED: Idea exists but no completed interview/research
 * 2. SPARK_COMPLETE: Spark mode completed (sparkStatus=COMPLETE && sparkResult exists)
 * 3. LIGHT_COMPLETE: Light interview complete + research complete (non-Spark)
 * 4. FORGE_COMPLETE: IN_DEPTH interview complete + research complete
 */
export function getResearchJourneyState(state: ResearchStateInput): JourneyState {
  const { idea, interview, research } = state;

  // Check for Spark completion first (doesn't require interview)
  const isSparkComplete =
    research?.sparkStatus === 'COMPLETE' ||
    research?.sparkStatus === 'PARTIAL_COMPLETE';

  if (isSparkComplete && research?.sparkResult) {
    // Check if there's also a full interview completed
    if (interview?.status === 'COMPLETE') {
      if (interview.mode === 'IN_DEPTH') {
        return 'FORGE_COMPLETE';
      }
      if (interview.mode === 'LIGHT' && research.status === 'COMPLETE') {
        return 'LIGHT_COMPLETE';
      }
    }
    return 'SPARK_COMPLETE';
  }

  // No interview started or idea just captured
  if (!interview || idea.status === 'CAPTURED') {
    return 'CAPTURED';
  }

  // Interview must be complete for Light or Forge states
  if (interview.status !== 'COMPLETE') {
    return 'CAPTURED';
  }

  // Check research completion for Light mode
  if (interview.mode === 'LIGHT' && research?.status === 'COMPLETE') {
    return 'LIGHT_COMPLETE';
  }

  // Check research completion for IN_DEPTH (Forge) mode
  if (interview.mode === 'IN_DEPTH' && research?.status === 'COMPLETE') {
    return 'FORGE_COMPLETE';
  }

  // Default: still in captured state (incomplete research)
  return 'CAPTURED';
}

// =============================================================================
// UPGRADE PATH DETECTION
// =============================================================================

/**
 * Returns available upgrade modes based on current journey state.
 * Empty array means the journey is complete (no upgrades available).
 */
export function getAvailableUpgrades(journeyState: JourneyState): InterviewMode[] {
  switch (journeyState) {
    case 'CAPTURED':
      return ['SPARK', 'LIGHT', 'IN_DEPTH'];
    case 'SPARK_COMPLETE':
      return ['LIGHT', 'IN_DEPTH'];
    case 'LIGHT_COMPLETE':
      return ['IN_DEPTH'];
    case 'FORGE_COMPLETE':
      return []; // Journey complete, hide banner
  }
}

/**
 * Checks if starting a new mode will replace existing research.
 */
export function willReplaceResearch(journeyState: JourneyState): boolean {
  // Replacing only happens when there's existing completed research
  return journeyState === 'SPARK_COMPLETE' || journeyState === 'LIGHT_COMPLETE';
}

/**
 * Get the appropriate replace message based on current state.
 */
export function getReplaceMessage(journeyState: JourneyState): string | null {
  switch (journeyState) {
    case 'SPARK_COMPLETE':
      return 'This will replace your current Spark validation with more comprehensive analysis.';
    case 'LIGHT_COMPLETE':
      return 'This will build on your Light interview with the full research suite and all reports.';
    default:
      return null;
  }
}

// =============================================================================
// MODE CONFIGURATION
// =============================================================================

export interface ModeConfig {
  name: string;
  tagline: string;
  description: string;
  color: string;
  bgColor: string;
  iconName: 'Sparkles' | 'Feather' | 'Microscope';
  benefits: string[];
  duration: string;
}

export const MODE_CONFIG: Record<InterviewMode, ModeConfig> = {
  SPARK: {
    name: 'Spark',
    tagline: 'Quick Validation',
    description: 'Instant demand signals, TAM estimate, and community insights',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    iconName: 'Sparkles',
    benefits: ['Market demand signals', 'TAM estimate', 'Reddit/FB insights'],
    duration: '2-3 min',
  },
  LIGHT: {
    name: 'Light',
    tagline: '10 Key Questions',
    description: 'Quick interview with essential business analysis',
    color: '#4ecdc4',
    bgColor: 'rgba(78, 205, 196, 0.15)',
    iconName: 'Feather',
    benefits: ['Core business analysis', 'Basic market research', 'Competitor overview'],
    duration: '15-20 min',
  },
  IN_DEPTH: {
    name: 'Forge',
    tagline: 'Complete Analysis',
    description: '65-question deep dive with full research suite and all reports',
    color: '#e91e8c',
    bgColor: 'rgba(233, 30, 140, 0.15)',
    iconName: 'Microscope',
    benefits: ['31 data points', 'Full o3 research', 'All 10 report types', 'Business plan'],
    duration: '45-60 min',
  },
};

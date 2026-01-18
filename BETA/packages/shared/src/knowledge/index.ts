// AI Knowledge Base
// This module exports the knowledge.json configuration for use by AI services

import knowledgeJson from '../knowledge.json';

// Type definitions for the knowledge structure
export interface KnowledgeConfig {
  version: string;
  lastUpdated: string;

  product: {
    name: string;
    tagline: string;
    description: string;
    targetUser: string;
    valueProposition: string;
  };

  interview: {
    persona: {
      name: string;
      role: string;
      tone: string[];
      avoid: string[];
    };
    priorities: {
      highValue: string[];
      mediumValue: string[];
      alwaysAsk: string[];
    };
    rules: string[];
    guardrails: string[];
    closingBehavior: {
      whenToWrapUp: string[];
      closingApproach: string;
    };
  };

  research: {
    persona: {
      name: string;
      role: string;
      tone: string[];
    };
    analysisGuidelines: string[];
    scoringCriteria: {
      opportunityScore: Record<string, string>;
      problemScore: Record<string, string>;
      feasibilityScore: Record<string, string>;
      whyNowScore: Record<string, string>;
    };
    guardrails: string[];
    reportGuidelines: {
      structure: string[];
      quality: string[];
    };
  };

  contentGuidelines: {
    userStory: {
      requirements: string[];
      example: {
        good: string;
        bad: string;
      };
    };
    competitors: {
      requirements: string[];
    };
    keywords: {
      requirements: string[];
    };
    valueLadder: {
      requirements: string[];
    };
    actionPrompts: {
      requirements: string[];
    };
  };

  socialProof: {
    note: string;
    requirements: string[];
    disclaimers: {
      showInUI: boolean;
      text: string;
    };
  };

  prohibitedContent: {
    topics: string[];
    claims: string[];
  };

  brandVoice: {
    personality: string[];
    writingStyle: {
      prefer: string[];
      avoid: string[];
    };
  };

  customInstructions: {
    global: string[];
    interviewOnly: string[];
    researchOnly: string[];
  };
}

// Export the knowledge configuration
export const KNOWLEDGE: KnowledgeConfig = knowledgeJson as KnowledgeConfig;

// Helper: Build interview system prompt additions from knowledge
export function getInterviewKnowledge(): string {
  const { interview, brandVoice, prohibitedContent, customInstructions } = KNOWLEDGE;

  const sections = [
    `## PERSONA
You are ${interview.persona.name}, a ${interview.persona.role}.

Tone: ${interview.persona.tone.join(', ')}

Avoid: ${interview.persona.avoid.join('; ')}`,

    `## INTERVIEW RULES
${interview.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,

    `## PRIORITY DATA POINTS
HIGH VALUE (focus on these):
${interview.priorities.highValue.map(p => `- ${p}`).join('\n')}

ALWAYS COVER:
${interview.priorities.alwaysAsk.map(p => `- ${p}`).join('\n')}`,

    `## GUARDRAILS
${interview.guardrails.map(g => `- ${g}`).join('\n')}`,

    `## CLOSING
When to wrap up: ${interview.closingBehavior.whenToWrapUp.join('; ')}
Approach: ${interview.closingBehavior.closingApproach}`,

    `## PROHIBITED
Topics: ${prohibitedContent.topics.join(', ')}
Claims: ${prohibitedContent.claims.join(', ')}`,
  ];

  // Add custom instructions if any
  const customRules = [...customInstructions.global, ...customInstructions.interviewOnly];
  if (customRules.length > 0) {
    sections.push(`## CUSTOM RULES\n${customRules.map(r => `- ${r}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

// Helper: Build research system prompt additions from knowledge
export function getResearchKnowledge(): string {
  const { research, contentGuidelines, prohibitedContent, customInstructions } = KNOWLEDGE;

  const sections = [
    `## PERSONA
You are ${research.persona.name}, a ${research.persona.role}.
Tone: ${research.persona.tone.join(', ')}`,

    `## ANALYSIS GUIDELINES
${research.analysisGuidelines.map((g, i) => `${i + 1}. ${g}`).join('\n')}`,

    `## SCORING CRITERIA
Opportunity Score:
${Object.entries(research.scoringCriteria.opportunityScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

Problem Score:
${Object.entries(research.scoringCriteria.problemScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

Feasibility Score:
${Object.entries(research.scoringCriteria.feasibilityScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

Why Now Score:
${Object.entries(research.scoringCriteria.whyNowScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}`,

    `## REPORT QUALITY
Structure: ${research.reportGuidelines.structure.join('; ')}
Quality: ${research.reportGuidelines.quality.join('; ')}`,

    `## GUARDRAILS
${research.guardrails.map(g => `- ${g}`).join('\n')}`,

    `## PROHIBITED
Topics: ${prohibitedContent.topics.join(', ')}
Claims: ${prohibitedContent.claims.join(', ')}`,
  ];

  // Add custom instructions if any
  const customRules = [...customInstructions.global, ...customInstructions.researchOnly];
  if (customRules.length > 0) {
    sections.push(`## CUSTOM RULES\n${customRules.map(r => `- ${r}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

// Helper: Get content guidelines for a specific type
export function getContentGuidelines(type: keyof typeof KNOWLEDGE.contentGuidelines): string[] {
  const guidelines = KNOWLEDGE.contentGuidelines[type];
  if ('requirements' in guidelines) {
    return guidelines.requirements;
  }
  return [];
}

// Helper: Get social proof disclaimer
export function getSocialProofDisclaimer(): { show: boolean; text: string } {
  return {
    show: KNOWLEDGE.socialProof.disclaimers.showInUI,
    text: KNOWLEDGE.socialProof.disclaimers.text,
  };
}

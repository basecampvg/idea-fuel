/**
 * Card AI Service — Builds research briefs and extracts CardResult from Sonar Pro output
 *
 * Used by the sparkCard router for mobile quick validation cards.
 * - buildResearchBrief: concatenates project + chat answers into a Sonar Pro prompt
 * - extractCardResult: calls Anthropic Haiku to extract structured CardResult from prose
 */

import { cardResultSchema } from '@forge/shared';
import type { CardResult, CardChatMessage } from '@forge/shared';
import { getAnthropicClient } from '../lib/anthropic';

// ============================================================================
// Constants
// ============================================================================

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

/**
 * The 3 fixed chat questions asked before validation
 */
export const CARD_CHAT_QUESTIONS: string[] = [
  'What problem are you solving, and what happens if it stays unsolved?',
  'Who has this problem today, and how are they currently dealing with it?',
  'How will this make money? (e.g., subscription, one-time purchase, marketplace, ads)',
];

// ============================================================================
// Smart Suggestions for Chat Questions
// ============================================================================

/**
 * Generate 2-3 suggested answers for a chat question based on the project idea.
 * Uses Haiku for speed/cost. Returns empty array on failure (non-blocking).
 */
export async function generateSuggestions(
  title: string,
  description: string,
  question: string,
  turnIndex: number
): Promise<string[]> {
  const client = getAnthropicClient();

  try {
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500,
      temperature: 0.7,
      system: `You generate short, realistic suggested answers to business validation questions. The user has a business idea and is answering questions about it. Based on their idea, suggest 2-3 plausible answers they might give.

Return valid JSON: an array of 2-3 strings. Each string is a concise answer (1-2 sentences max, under 120 characters). Make them specific to THIS idea, not generic.

Return ONLY the JSON array, no markdown wrapping.`,
      messages: [
        {
          role: 'user',
          content: `Business idea: ${title}\nDescription: ${description}\n\nQuestion being asked: ${question}\n\nGenerate 2-3 suggested answers the founder might give:`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') return [];

    let jsonStr = content.text.trim();

    // Strip markdown code fences if present
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.every((s: unknown) => typeof s === 'string')) {
      return parsed.slice(0, 3);
    }
    return [];
  } catch (error) {
    // Non-blocking — suggestions are optional
    console.warn('[CardAI] Suggestion generation failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

// ============================================================================
// Build Research Brief
// ============================================================================

/**
 * Concatenates the project title, description, and chat Q&A into a structured
 * research brief string for Sonar Pro.
 */
export function buildResearchBrief(
  title: string,
  description: string,
  chatMessages: CardChatMessage[]
): string {
  const sections: string[] = [
    `# Business Idea: ${title}`,
    '',
    `## Description`,
    description || '(No description provided)',
    '',
    `## Founder Answers`,
  ];

  // Pair up Q&A from chat messages
  // Messages alternate: assistant (question) → user (answer)
  for (const msg of chatMessages) {
    if (msg.role === 'assistant') {
      sections.push(`\n**Q: ${msg.content}**`);
    } else if (msg.role === 'user') {
      sections.push(`A: ${msg.content}`);
    }
  }

  sections.push('');
  sections.push('## Research Request');
  sections.push(
    'Based on this business idea and the founder\'s answers, please research and provide:',
  );
  sections.push('1. How severe is the problem (1-5 scale) and what evidence supports this?');
  sections.push('2. What are the market signals — is demand rising, flat, or declining?');
  sections.push('3. What is the rough total addressable market (TAM) range?');
  sections.push('4. Who are the top 1-3 competitors and what is each known for?');
  sections.push('5. What is the single biggest risk for this idea?');
  sections.push('6. What is one concrete experiment the founder should run next?');
  sections.push('7. Overall verdict: should the founder proceed, watchlist, or drop this idea?');

  return sections.join('\n');
}

// ============================================================================
// Extract Card Result
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are a structured data extraction assistant. You extract startup validation data from research text and return it as valid JSON.

Return ONLY valid JSON matching this exact schema — no markdown, no code fences, no commentary:

{
  "verdict": "proceed" | "watchlist" | "drop",
  "summary": "1-2 sentence summary of the validation finding",
  "problemSeverity": 1-5,
  "marketSignal": "rising" | "flat" | "declining" | "unknown",
  "tamEstimate": {
    "low": "$X million/billion",
    "high": "$Y million/billion",
    "basis": "brief explanation of how TAM was estimated"
  },
  "competitors": [
    { "name": "Competitor Name", "oneLiner": "What they do in one line" }
  ],
  "biggestRisk": "The single biggest risk in one sentence",
  "nextExperiment": "One concrete actionable experiment to run next",
  "citations": ["url1", "url2"]
}

Rules:
- competitors array: max 3 entries
- problemSeverity: integer 1-5
- If data is missing, use reasonable defaults: "unknown" for strings, 3 for severity, "unknown" for marketSignal
- citations: include any URLs found in the research text
- Every field is REQUIRED`;

/**
 * Calls Anthropic Haiku to extract a structured CardResult from raw Sonar Pro prose.
 * On parse failure, returns a partial CardResult with rawResponse populated.
 */
export async function extractCardResult(
  sonarResponse: string,
  citations: string[] = []
): Promise<CardResult> {
  const client = getAnthropicClient();

  try {
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      temperature: 0,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract the validation card data from this research output. Include these citation URLs in the citations array: ${JSON.stringify(citations)}\n\n---\n\n${sonarResponse}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Haiku');
    }

    // Parse JSON from response
    const jsonStr = content.text.trim();
    let parsed: unknown;

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to extract JSON from markdown code blocks
      const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        // Try to find a JSON object in the text
        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) {
          parsed = JSON.parse(objMatch[0]);
        } else {
          throw new Error('No JSON found in Haiku response');
        }
      }
    }

    // Validate with Zod schema
    const result = cardResultSchema.safeParse(parsed);
    if (result.success) {
      console.log('[CardAI] Extraction successful, verdict:', result.data.verdict);
      return result.data;
    }

    // Validation failed — log errors and fall back
    console.error('[CardAI] Zod validation failed:', result.error.issues.slice(0, 3));

    // Try to salvage what we can — merge with defaults
    return buildFallbackCard(sonarResponse, citations);
  } catch (error) {
    console.error('[CardAI] Extraction failed:', error instanceof Error ? error.message : error);
    return buildFallbackCard(sonarResponse, citations);
  }
}

/**
 * Build a fallback CardResult when extraction fails.
 * Provides a valid CardResult with rawResponse so the mobile app can still display something.
 */
function buildFallbackCard(rawText: string, citations: string[]): CardResult {
  return {
    verdict: 'watchlist',
    summary: 'Validation research completed but structured extraction failed. See raw response below.',
    problemSeverity: 3,
    marketSignal: 'unknown',
    tamEstimate: {
      low: 'Unknown',
      high: 'Unknown',
      basis: 'Extraction failed — see raw response',
    },
    competitors: [],
    biggestRisk: 'Unable to extract — review raw research output',
    nextExperiment: 'Review the raw research output and identify key findings manually',
    citations,
    rawResponse: rawText,
  };
}

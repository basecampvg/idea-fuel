import type { CanvasBlock } from '../types';

const MAX_AI_CONTEXT_CHARS = 4000;

/**
 * Serialize canvas blocks into a markdown string for AI context injection.
 * Produces clean, labeled sections that LLMs can easily parse.
 * Truncates to MAX_AI_CONTEXT_CHARS to avoid token overflow.
 */
export function serializeCanvasForAI(blocks: CanvasBlock[]): string {
  if (!blocks || blocks.length === 0) return '';

  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const parts: string[] = [];

  for (const block of sorted) {
    switch (block.type) {
      case 'section': {
        const title = block.sectionType === 'custom'
          ? block.title
          : formatSectionTitle(block.sectionType);
        if (block.content.trim()) {
          parts.push(`## ${title}\n${block.content.trim()}`);
        }
        break;
      }
      case 'note': {
        if (block.content.trim()) {
          parts.push(`## Note\n${block.content.trim()}`);
        }
        break;
      }
      case 'subIdea': {
        if (block.title.trim() || block.description.trim()) {
          parts.push(`## Sub-Idea: ${block.title.trim()}\n${block.description.trim()}`);
        }
        break;
      }
      case 'link': {
        const label = block.title || block.url;
        const desc = block.description ? ` — ${block.description}` : '';
        parts.push(`## Reference Link\n${label}${desc}\n${block.url}`);
        break;
      }
    }
  }

  const result = parts.join('\n\n');

  if (result.length > MAX_AI_CONTEXT_CHARS) {
    return result.slice(0, MAX_AI_CONTEXT_CHARS) + '\n\n[Canvas content truncated]';
  }

  return result;
}

function formatSectionTitle(sectionType: string): string {
  const titles: Record<string, string> = {
    target_audience: 'Target Audience',
    problem_statement: 'Problem Statement',
    competitors: 'Competitors',
    inspiration: 'Inspiration',
    open_questions: 'Open Questions',
    revenue_model: 'Revenue Model',
  };
  return titles[sectionType] || sectionType;
}

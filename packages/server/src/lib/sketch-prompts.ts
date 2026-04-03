import type { SketchTemplateType } from '@forge/shared/constants';

/**
 * Base prompt segments per template type.
 * Matt will fill in the actual prompt text.
 */
const BASE_PROMPTS: Record<SketchTemplateType, string> = {
  app_page: 'TODO: Matt provides app page prompt',
  web_layout: 'TODO: Matt provides web layout prompt',
  physical_object: 'TODO: Matt provides physical object prompt',
  scene: 'TODO: Matt provides scene prompt',
};

/**
 * Annotations prompt segment — appended when annotations toggle is ON.
 */
const ANNOTATIONS_SEGMENT = 'TODO: Matt provides annotations prompt segment';

/**
 * Assembles the full prompt for Gemini image generation.
 */
export function buildSketchPrompt(opts: {
  templateType: SketchTemplateType;
  description: string;
  annotations: boolean;
}): string {
  let prompt = BASE_PROMPTS[opts.templateType];
  prompt += `\n\nSubject: ${opts.description}`;

  if (opts.annotations) {
    prompt += `\n\n${ANNOTATIONS_SEGMENT}`;
  }

  return prompt;
}

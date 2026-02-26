/**
 * Industry Template Registry
 *
 * Templates are static TypeScript files (not database rows).
 * MVP ships with 4 templates; additional templates are content, not code.
 */

import type { TemplateDefinition } from '@forge/shared';
import { saasTemplate } from './saas';
import { professionalServicesTemplate } from './professional-services';
import { ecommerceTemplate } from './ecommerce';
import { generalTemplate } from './general';

/** All available industry templates, keyed by slug. */
export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  [saasTemplate.slug]: saasTemplate,
  [professionalServicesTemplate.slug]: professionalServicesTemplate,
  [ecommerceTemplate.slug]: ecommerceTemplate,
  [generalTemplate.slug]: generalTemplate,
};

/** Get a template by slug, or null if not found. */
export function getTemplate(slug: string): TemplateDefinition | null {
  return TEMPLATE_REGISTRY[slug] ?? null;
}

/** List all templates for display (sorted by category then name). */
export function listTemplates(): TemplateDefinition[] {
  return Object.values(TEMPLATE_REGISTRY).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });
}

/** Get templates filtered by category. */
export function getTemplatesByCategory(category: string): TemplateDefinition[] {
  return Object.values(TEMPLATE_REGISTRY).filter((t) => t.category === category);
}

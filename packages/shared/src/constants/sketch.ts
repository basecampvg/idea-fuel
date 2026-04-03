export const SKETCH_TEMPLATE_TYPES = [
  'app_page',
  'web_layout',
  'physical_object',
  'scene',
] as const;

export type SketchTemplateType = (typeof SKETCH_TEMPLATE_TYPES)[number];

export const SKETCH_TEMPLATE_LABELS: Record<SketchTemplateType, string> = {
  app_page: 'App Page',
  web_layout: 'Web Layout',
  physical_object: 'Physical Object',
  scene: 'Scene',
};

export const SKETCH_MAX_DESCRIPTION_LENGTH = 500;

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

export const SKETCH_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
export type SketchAspectRatio = (typeof SKETCH_ASPECT_RATIOS)[number];

export const SKETCH_ASPECT_RATIO_LABELS: Record<SketchAspectRatio, string> = {
  '1:1': 'Square',
  '16:9': 'Landscape',
  '9:16': 'Portrait',
  '4:3': 'Standard',
  '3:4': 'Tall',
};

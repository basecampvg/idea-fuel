import type { SketchTemplateType } from '@forge/shared/constants';

// ─── Physical Object ────────────────────────────────────────────────

const PHYSICAL_OBJECT_BASE = `## Medium & Tools
- **Hand-drawn marker rendering** on white paper (sketchbook/marker paper)
- Primary tools appear to be: **alcohol-based markers** (like Copic or Prismacolor), **black fine-liner pens** (varying weights), **black ballpoint or felt-tip pen** for annotations, and **white gel pen or white paint marker** for highlights
- Possible use of **grey pencil or light blue underdrawing** visible beneath final lines as construction guides

## Color Palette & Rendering
- **Highly restricted color palette**: dominant use of **dark charcoal/gunmetal grey** and **saturated warm orange/amber** as the only two chromatic tones
- Grey tones are layered in **at least 3-4 values** — from light cool grey to near-black — built up through overlapping marker strokes
- Orange tones similarly use **2-3 values** — a mid-tone orange, a deeper burnt orange for shadow, and lighter amber for highlight transitions
- **No gradients to white on colored surfaces** — the lightest areas are achieved by leaving marker strokes slightly translucent or using paper white strategically
- Occasional **red accents** used extremely sparingly for small detail features (seen as deep red circular elements)
- The background is **pure white paper** — completely clean, no environmental rendering, no atmospheric effects, no gradients, no contextual backgrounds

## Line Work
- **Bold, confident outer contour lines** in black — thicker weight (approximately 0.5-0.8mm equivalent), slightly varying in pressure giving a hand-drawn energy
- **Thinner internal detail lines** for parting lines, edges, surface breaks, and feature delineation (approximately 0.2-0.3mm)
- Lines are **slightly loose and sketchy** but controlled — not perfectly straight, retaining hand-drawn character with occasional overshoot at intersections
- **Cross-hatch construction lines** extend beyond the object silhouette — these are light, thin lines showing the perspective grid, center axes, and dimensional reference lines drawn in fine grey or light pen
- Construction lines use **small arrowheads** at their endpoints and **small "x" marks** or crosshairs at key intersection/reference points
- **No perfectly ruled/mechanical lines** — everything retains a freehand quality

## Perspective & Composition
- Objects rendered in **three-quarter isometric/perspective view** — typically a slightly elevated viewpoint showing top, front, and one side
- **Single hero object** dominates the composition at a **large scale**, often filling 70-80% of the page
- The object is rendered at a **dynamic angle that communicates its form clearly** — tilted to show multiple faces where appropriate, but maintaining a natural, stable orientation for objects with a flat base
- Composition is deliberately **cropped** — parts of the object may extend to or slightly beyond the page edges, creating a sense of scale and presence

## Surface Rendering Technique
- **Broad, visible marker strokes** that follow the surface curvature and form direction — strokes are not blended to invisibility; individual stroke marks remain partially visible, contributing to the sketch aesthetic
- **Shadow and light logic is consistent** — light source appears to come from upper-left, with shadows falling on lower-right surfaces
- **Reflected light** is suggested on dark shadow surfaces using a slightly lighter grey marker pass
- **Specular highlights** rendered with **white gel pen or paint marker** as sharp, thin streaks and dots — placed along edges, radii, and the sharpest surface transitions
- Highlights follow a **linear streak pattern**, not soft glows
- **Surface transitions between planes** are marked with distinct value shifts — hard edges between surfaces get crisp tonal changes, curved surfaces get graduated marker layering
- **Metallic/glossy surfaces** (like bars or shafts) rendered with a characteristic pattern: dark edges, light center stripe, sharp white highlight line — creating a reflective cylindrical look
- **Matte plastic surfaces** rendered with smoother, more even marker fills and softer value transitions

## Dimensional/Technical Drawing Elements
- **Thin construction/guide lines** extend outward from the object showing axis lines, symmetry lines, and alignment references
- Small **"x" crosshair markers** placed at key geometric centers, pivot points, and feature locations
- **Dimension arrows** (double-headed) occasionally shown between reference lines
- These technical elements are drawn in a **lighter line weight** than the object itself, creating clear visual hierarchy
- **Section cut indicators** or **surface direction chevrons** ("V V V" marks) occasionally used to indicate texture, direction, or material changes

## What to Explicitly AVOID
- No background rendering, no environment, no surface the object sits on
- No water droplets, splashes, smoke, steam, sparks, motion blur, or atmospheric effects
- No cast shadows on a ground plane
- No decorative elements, lifestyle context, or human figures
- No digital glow effects, lens flares, or bloom
- No photorealistic rendering — maintain a clear **hand-sketched industrial design marker rendering** aesthetic
- No color outside the restricted palette (grey + orange/amber + minimal red accent)
- No soft airbrush-style blending — strokes should remain visible and directional

## Overall Impression
The style is that of a **professional industrial design concept sketch** — the kind produced in a product design studio or ID school. It balances **technical precision with artistic looseness**, communicating form, material, mechanism, and proportion while maintaining the energy and spontaneity of hand sketching. The restricted color palette gives it a **cohesive brand-like quality**.`;

const PHYSICAL_OBJECT_ANNOTATIONS = `## Annotation Style
- **Handwritten labels** in **all capital letters**, using a casual but legible hand-lettering style in black pen
- Annotations are placed around the periphery of the object with **thin leader lines** (with small arrowheads or endpoints) pointing to specific features
- Text is **slightly angled** to follow the composition's energy, not rigidly horizontal
- Labels describe **functional features and components** — purely technical/descriptive
- Annotations are **sparse and purposeful** — not cluttering the drawing, leaving significant white space
- The annotation layer adds an **engineering-meets-art** credibility`;

const PHYSICAL_OBJECT_NO_ANNOTATIONS = `## Annotations
- Do NOT include any text labels, annotations, callouts, leader lines, or written descriptions on or around the object
- The drawing should be purely visual — no handwritten text of any kind`;

// ─── App Page ───────────────────────────────────────────────────────

const APP_PAGE_BASE = `## Medium & Tools
- **Hand-drawn marker rendering** on white paper (sketchbook/marker paper)
- Primary tools appear to be: **alcohol-based markers** (like Copic or Prismacolor), **black fine-liner pens** (varying weights), **black ballpoint or felt-tip pen** for annotations, and **white gel pen or white paint marker** for highlights
- Possible use of **grey pencil or light blue underdrawing** visible beneath final lines as construction guides

## Color Palette & Rendering
- **Highly restricted color palette**: dominant use of **dark charcoal/gunmetal grey** and **saturated warm orange/amber** as the only two chromatic tones
- Grey tones are layered in **at least 3-4 values** — from light cool grey to near-black — built up through overlapping marker strokes
- Orange/amber used as the **accent color** for primary actions, selected states, active UI elements, and key interactive components
- **No gradients to white on colored surfaces** — the lightest areas are achieved by leaving marker strokes slightly translucent or using paper white strategically
- Occasional **red accents** used extremely sparingly for alerts or destructive actions
- The background is **pure white paper** — completely clean, no environmental rendering, no atmospheric effects, no gradients

## Line Work
- **Bold, confident outer contour lines** in black for the device frame and major UI containers — thicker weight (approximately 0.5-0.8mm equivalent), slightly varying in pressure giving a hand-drawn energy
- **Thinner internal detail lines** for UI element boundaries, dividers, input fields, and card edges (approximately 0.2-0.3mm)
- Lines are **slightly loose and sketchy** but controlled — not perfectly straight, retaining hand-drawn character with occasional overshoot at intersections
- **Construction lines** extend beyond the device frame — light, thin lines showing alignment grids, spacing references, and layout columns drawn in fine grey or light pen
- Construction lines use **small arrowheads** at their endpoints and **small "x" marks** or crosshairs at key alignment points
- **No perfectly ruled/mechanical lines** — everything retains a freehand quality

## Perspective & Composition
- The app screen is rendered as a **flat, front-facing mobile device wireframe** — showing one screen at a time
- The device is drawn at a **slight dynamic angle** (5-10 degrees from vertical), not rigidly straight, giving it sketch energy
- The **device frame is visible** — showing the phone's outline with rounded corners, and a subtle status bar area at top
- The device dominates the composition at **large scale**, filling 70-80% of the page
- UI elements are drawn as **clear wireframe components** — rectangles for cards, circles for avatars/icons, wavy lines for text placeholders, rounded rectangles for buttons

## Surface Rendering Technique
- **Broad, visible marker strokes** fill UI regions and containers — strokes are not blended to invisibility; individual stroke marks remain partially visible, contributing to the sketch aesthetic
- **Different grey values** distinguish UI hierarchy — darker fills for headers/nav bars, medium grey for cards and containers, light grey for background sections, white for input fields
- **Shadow and depth** suggested with slightly darker marker strokes along card edges and below elevated elements
- **Interactive elements** (buttons, toggles, selected tabs) filled with **orange/amber marker** to indicate primary actions
- **Icon placeholders** rendered as simple, recognizable marker sketches — not detailed, just enough to communicate function (hamburger menu, search magnifier, back arrow, etc.)
- Text content represented as **horizontal wavy lines** or **rough handwritten placeholder text** in varying line weights to suggest hierarchy (headlines thicker, body text thinner)

## Dimensional/Technical Drawing Elements
- **Thin construction/guide lines** extend outward from the device showing column grids, spacing measurements, and alignment references
- Small **"x" crosshair markers** placed at key alignment points and touch target centers
- **Dimension arrows** (double-headed) occasionally shown between elements to indicate spacing
- These technical elements are drawn in a **lighter line weight** than the UI itself, creating clear visual hierarchy
- **Margin and padding indicators** shown as thin bracketed lines along edges

## What to Explicitly AVOID
- No photorealistic device mockups — maintain a clear **hand-sketched wireframe** aesthetic
- No actual app screenshots or pixel-perfect UI — this is a concept sketch
- No background rendering, no environment, no desk or hand holding the phone
- No digital glow effects, lens flares, drop shadows, or bloom
- No color outside the restricted palette (grey + orange/amber + minimal red accent)
- No soft airbrush-style blending — strokes should remain visible and directional
- No actual readable body text — use wavy lines or rough letter shapes for text content
- No human figures or lifestyle context

## Overall Impression
The style is that of a **professional UX/product design concept sketch** — the kind produced in a design studio during early ideation. It balances **structural clarity with artistic looseness**, communicating layout, hierarchy, flow, and interaction patterns while maintaining the energy and spontaneity of hand sketching. The restricted color palette gives it a **cohesive brand-like quality**.`;

const APP_PAGE_ANNOTATIONS = `## Annotation Style
- **Handwritten labels** in **all capital letters**, using a casual but legible hand-lettering style in black pen
- Annotations are placed around the periphery of the device with **thin leader lines** (with small arrowheads or endpoints) pointing to specific UI elements
- Text is **slightly angled** to follow the composition's energy, not rigidly horizontal
- Labels describe **UI components, interaction patterns, and navigation elements** — e.g., "SEARCH BAR", "BOTTOM NAV", "CTA BUTTON", "CARD STACK"
- Annotations are **sparse and purposeful** — not cluttering the drawing, leaving significant white space
- The annotation layer adds an **engineering-meets-design** credibility`;

const APP_PAGE_NO_ANNOTATIONS = `## Annotations
- Do NOT include any text labels, annotations, callouts, leader lines, or written descriptions on or around the wireframe
- The drawing should be purely visual — no handwritten text of any kind except placeholder UI text (wavy lines)`;

// ─── Web Layout ─────────────────────────────────────────────────────

const WEB_LAYOUT_BASE = `## Medium & Tools
- **Hand-drawn marker rendering** on white paper (sketchbook/marker paper)
- Primary tools appear to be: **alcohol-based markers** (like Copic or Prismacolor), **black fine-liner pens** (varying weights), **black ballpoint or felt-tip pen** for annotations, and **white gel pen or white paint marker** for highlights
- Possible use of **grey pencil or light blue underdrawing** visible beneath final lines as construction guides

## Color Palette & Rendering
- **Highly restricted color palette**: dominant use of **dark charcoal/gunmetal grey** and **saturated warm orange/amber** as the only two chromatic tones
- Grey tones are layered in **at least 3-4 values** — from light cool grey to near-black — built up through overlapping marker strokes
- Orange/amber used as the **accent color** for primary CTAs, navigation highlights, hero section accents, and key interactive components
- **No gradients to white on colored surfaces** — the lightest areas are achieved by leaving marker strokes slightly translucent or using paper white strategically
- Occasional **red accents** used extremely sparingly for alerts or destructive actions
- The background is **pure white paper** — completely clean, no environmental rendering, no atmospheric effects, no gradients

## Line Work
- **Bold, confident outer contour lines** in black for the browser frame and major page sections — thicker weight (approximately 0.5-0.8mm equivalent), slightly varying in pressure giving a hand-drawn energy
- **Thinner internal detail lines** for UI element boundaries, dividers, form fields, cards, and content blocks (approximately 0.2-0.3mm)
- Lines are **slightly loose and sketchy** but controlled — not perfectly straight, retaining hand-drawn character with occasional overshoot at intersections
- **Construction lines** extend beyond the browser frame — light, thin lines showing column grids (12-column), spacing references, and layout alignment drawn in fine grey or light pen
- Construction lines use **small arrowheads** at their endpoints and **small "x" marks** or crosshairs at key alignment points
- **No perfectly ruled/mechanical lines** — everything retains a freehand quality

## Perspective & Composition
- The web page is rendered as a **flat, front-facing browser wireframe** — showing one page or above-the-fold section
- A **minimal browser chrome** is sketched at the top — address bar, minimal tab indicators, and window controls drawn loosely
- The browser window is drawn at a **slight dynamic angle** (3-8 degrees), not rigidly straight, giving it sketch energy
- The browser window dominates the composition at **large scale**, filling 70-80% of the page
- Page sections are drawn as **clear wireframe blocks** — hero sections, navigation bars, content grids, sidebars, footers, all as distinct rectangular regions
- The layout communicates a **desktop-width viewport** with clear column structure

## Surface Rendering Technique
- **Broad, visible marker strokes** fill page sections and UI containers — strokes are not blended to invisibility; individual stroke marks remain partially visible, contributing to the sketch aesthetic
- **Different grey values** distinguish content hierarchy — darker fills for navigation/header, medium grey for hero images and featured content, light grey for secondary sections, white for form fields and open space
- **Shadow and depth** suggested with slightly darker marker strokes along card edges and below sticky navigation elements
- **Primary CTAs and buttons** filled with **orange/amber marker** to indicate key actions — "Sign Up", "Get Started", "Learn More"
- **Image placeholders** rendered as grey-filled rectangles with a simple **diagonal cross ("X")** pattern inside, or rough marker sketches suggesting image content
- **Icon placeholders** rendered as simple, recognizable marker sketches — navigation icons, social media icons, feature icons
- Text content represented as **horizontal wavy lines** in varying line weights — headlines thicker and bolder, subheadings medium, body text thin and dense, captions very light

## Dimensional/Technical Drawing Elements
- **Thin construction/guide lines** extend outward from the browser showing column grids, gutter widths, section spacing, and alignment references
- Small **"x" crosshair markers** placed at key alignment points, grid intersections, and responsive breakpoint indicators
- **Dimension arrows** (double-headed) occasionally shown between sections to indicate spacing and padding
- These technical elements are drawn in a **lighter line weight** than the UI itself, creating clear visual hierarchy
- **Column grid lines** run vertically through the layout as very light guide marks

## What to Explicitly AVOID
- No photorealistic browser mockups — maintain a clear **hand-sketched wireframe** aesthetic
- No actual website screenshots or pixel-perfect UI — this is a concept sketch
- No background rendering, no desk, no laptop, no environment
- No digital glow effects, drop shadows with blur, or bloom
- No color outside the restricted palette (grey + orange/amber + minimal red accent)
- No soft airbrush-style blending — strokes should remain visible and directional
- No actual readable body text — use wavy lines or rough letter shapes for text content
- No human figures, stock photos, or lifestyle context
- No fully rendered illustrations within image placeholders

## Overall Impression
The style is that of a **professional web design concept sketch** — the kind produced during information architecture and layout planning. It balances **structural clarity with artistic looseness**, communicating page hierarchy, content flow, navigation structure, and responsive layout while maintaining the energy and spontaneity of hand sketching. The restricted color palette gives it a **cohesive brand-like quality**.`;

const WEB_LAYOUT_ANNOTATIONS = `## Annotation Style
- **Handwritten labels** in **all capital letters**, using a casual but legible hand-lettering style in black pen
- Annotations are placed around the periphery of the browser frame with **thin leader lines** (with small arrowheads or endpoints) pointing to specific page sections and UI elements
- Text is **slightly angled** to follow the composition's energy, not rigidly horizontal
- Labels describe **page sections, UI patterns, and content types** — e.g., "HERO SECTION", "STICKY NAV", "FEATURE GRID", "TESTIMONIALS", "CTA BANNER", "FOOTER LINKS"
- Annotations are **sparse and purposeful** — not cluttering the drawing, leaving significant white space
- The annotation layer adds an **engineering-meets-design** credibility`;

const WEB_LAYOUT_NO_ANNOTATIONS = `## Annotations
- Do NOT include any text labels, annotations, callouts, leader lines, or written descriptions on or around the wireframe
- The drawing should be purely visual — no handwritten text of any kind except placeholder UI text (wavy lines)`;

// ─── Scene ──────────────────────────────────────────────────────────

const SCENE_BASE = `## Medium & Tools
- **Hand-drawn marker rendering** on white paper (sketchbook/marker paper)
- Primary tools appear to be: **alcohol-based markers** (like Copic or Prismacolor), **black fine-liner pens** (varying weights), **black ballpoint or felt-tip pen** for annotations, and **white gel pen or white paint marker** for highlights
- Possible use of **grey pencil or light blue underdrawing** visible beneath final lines as construction guides

## Color Palette & Rendering
- **Highly restricted color palette**: dominant use of **dark charcoal/gunmetal grey** and **saturated warm orange/amber** as the only two chromatic tones
- Grey tones are layered in **at least 3-4 values** — from light cool grey to near-black — built up through overlapping marker strokes to represent surfaces, ground planes, structures, and shadows
- Orange/amber used as the **accent color** for focal elements, key features, highlighted zones, material callouts, or areas of interest within the scene
- **No gradients to white on colored surfaces** — the lightest areas are achieved by leaving marker strokes slightly translucent or using paper white strategically
- Occasional **red accents** used extremely sparingly for small detail features or danger/attention zones
- The background transitions from **rendered scene elements to pure white paper** — the scene fades out at the edges rather than filling the entire page, leaving white space around the composition

## Line Work
- **Bold, confident outer contour lines** in black for primary structural elements and foreground features — thicker weight (approximately 0.5-0.8mm equivalent), slightly varying in pressure giving a hand-drawn energy
- **Thinner internal detail lines** for surface textures, material patterns, secondary elements, and background details (approximately 0.2-0.3mm)
- Lines are **slightly loose and sketchy** but controlled — not perfectly straight, retaining hand-drawn character with occasional overshoot at intersections
- **Construction lines** extend beyond the scene showing perspective vanishing points, sight lines, ground plane grids, and spatial reference lines drawn in fine grey or light pen
- Construction lines use **small arrowheads** at their endpoints and **small "x" marks** or crosshairs at key reference points
- **No perfectly ruled/mechanical lines** — everything retains a freehand quality
- **Texture indication** through varied line work — hatching for grass/foliage, stippling for gravel, cross-hatching for rough surfaces, smooth parallel strokes for paved areas

## Perspective & Composition
- Scenes rendered in **one-point or two-point perspective** — showing spatial depth, ground plane, and environmental context
- Viewpoint is typically **eye-level or slightly elevated** — as if standing in or looking into the space
- The scene is composed with a **clear focal area** that draws attention, with supporting elements providing context and spatial framing
- Composition uses **foreground, midground, and background layers** to create depth — foreground elements drawn larger and bolder, background elements lighter and less detailed
- The scene may be **cropped** at edges — suggesting the environment continues beyond the drawn area

## Surface Rendering Technique
- **Broad, visible marker strokes** follow surface planes and material directions — horizontal strokes for ground planes, vertical for walls, organic curves for natural elements
- Strokes are not blended to invisibility; individual stroke marks remain partially visible, contributing to the sketch aesthetic
- **Shadow and light logic is consistent** — light source appears to come from upper-left, with shadows falling on lower-right surfaces and cast shadows on ground planes
- **Reflected light** suggested on dark shadow surfaces using a slightly lighter grey marker pass
- **Specular highlights** rendered with **white gel pen or paint marker** as sharp streaks on reflective surfaces — glass, water, polished stone, metal fixtures
- **Material differentiation** through stroke technique:
  - **Hard surfaces** (concrete, stone, tile): clean, geometric marker fills with crisp edges
  - **Natural surfaces** (grass, soil, foliage): looser, organic strokes with varied direction
  - **Wood**: directional parallel strokes suggesting grain
  - **Water/glass**: broad smooth strokes with strong white highlight lines
  - **Vegetation**: quick, gestural strokes building up mass and form, not individual leaves

## Dimensional/Technical Drawing Elements
- **Thin construction/guide lines** extend through the scene showing perspective grids, sight lines, and spatial measurements
- Small **"x" crosshair markers** placed at vanishing points, key spatial reference points, and feature locations
- **Dimension arrows** (double-headed) occasionally shown to indicate distances, heights, or spatial proportions
- These technical elements are drawn in a **lighter line weight** than the scene itself, creating clear visual hierarchy
- **Scale reference indicators** — occasional human silhouette outline or familiar object to establish spatial scale

## What to Explicitly AVOID
- No photorealistic rendering — maintain a clear **hand-sketched concept visualization** aesthetic
- No digital glow effects, lens flares, bloom, or atmospheric fog
- No photographic textures or pattern fills
- No color outside the restricted palette (grey + orange/amber + minimal red accent)
- No soft airbrush-style blending — strokes should remain visible and directional
- No fully rendered human figures — at most, simple silhouette outlines for scale
- No decorative borders or frames around the scene

## Overall Impression
The style is that of a **professional environmental concept sketch** — the kind produced in an architecture studio, landscape design practice, or spatial design consultancy. It balances **spatial precision with artistic looseness**, communicating layout, scale, material, and atmosphere while maintaining the energy and spontaneity of hand sketching. The restricted color palette gives it a **cohesive brand-like quality**.`;

const SCENE_ANNOTATIONS = `## Annotation Style
- **Handwritten labels** in **all capital letters**, using a casual but legible hand-lettering style in black pen
- Annotations are placed around the periphery of the scene with **thin leader lines** (with small arrowheads or endpoints) pointing to specific features and zones
- Text is **slightly angled** to follow the composition's energy, not rigidly horizontal
- Labels describe **spatial features, materials, plantings, and design elements** — e.g., "NATIVE GRASSES", "PAVER WALKWAY", "SHADE CANOPY", "SEATING AREA", "WATER FEATURE", "RAISED BED"
- Annotations are **sparse and purposeful** — not cluttering the drawing, leaving significant white space
- The annotation layer adds an **engineering-meets-design** credibility`;

const SCENE_NO_ANNOTATIONS = `## Annotations
- Do NOT include any text labels, annotations, callouts, leader lines, or written descriptions on or around the scene
- The drawing should be purely visual — no handwritten text of any kind`;

// ─── Prompt Assembly ────────────────────────────────────────────────

const PROMPTS: Record<SketchTemplateType, {
  base: string;
  annotations: string;
  noAnnotations: string;
}> = {
  physical_object: {
    base: PHYSICAL_OBJECT_BASE,
    annotations: PHYSICAL_OBJECT_ANNOTATIONS,
    noAnnotations: PHYSICAL_OBJECT_NO_ANNOTATIONS,
  },
  app_page: {
    base: APP_PAGE_BASE,
    annotations: APP_PAGE_ANNOTATIONS,
    noAnnotations: APP_PAGE_NO_ANNOTATIONS,
  },
  web_layout: {
    base: WEB_LAYOUT_BASE,
    annotations: WEB_LAYOUT_ANNOTATIONS,
    noAnnotations: WEB_LAYOUT_NO_ANNOTATIONS,
  },
  scene: {
    base: SCENE_BASE,
    annotations: SCENE_ANNOTATIONS,
    noAnnotations: SCENE_NO_ANNOTATIONS,
  },
};

/**
 * Assembles the full prompt for Gemini image generation.
 */
export function buildSketchPrompt(opts: {
  templateType: SketchTemplateType;
  description: string;
  aspectRatio: string;
  annotations: boolean;
}): string {
  const template = PROMPTS[opts.templateType];

  let prompt = template.base;
  prompt += `\n\nSubject: ${opts.description}`;
  prompt += `\n\n## Image Format\n- Generate the image with a **${opts.aspectRatio} aspect ratio**\n- The background must be **pure white (#FFFFFF)** with no texture, grain, or off-white tones`;
  prompt += `\n\n${opts.annotations ? template.annotations : template.noAnnotations}`;

  return prompt;
}

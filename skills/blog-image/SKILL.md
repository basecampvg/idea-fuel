---
name: blog-image
description: Generate marker-sketch illustrations for IdeaFuel blog posts. Analyzes a blog post, suggests hero and inline image opportunities, generates images via Gemini in a consistent brand style, and organizes them into post-specific folders. Use when creating or updating blog imagery. Trigger on "blog image", "blog images", "generate blog images", "blog illustration", or "/blog-image".
---

# Blog Image Generation

Generate editorial marker-sketch illustrations for IdeaFuel blog posts using Gemini image generation.

## Prerequisites

- `GEMINI_API_KEY` environment variable must be set
- Python 3.10+ with `google-genai` package installed (`pip install google-genai`)

## Workflow

This skill runs in three phases. Do NOT skip phases or combine them.

### Phase 1 — Analyze the Blog Post

**Input:** The user provides a blog post identifier:
- A post slug (e.g., `best-ai-business-plan-generator`)
- A path to a seed content file (e.g., `packages/server/src/scripts/blog-content/post-01-business-plan-generator.ts`)

**Action:**

1. Read the blog post content. For seed files, read the TypeScript file directly. For slugs, look for a matching seed file in `packages/server/src/scripts/blog-content/`.
2. Analyze the post structure — identify headings, key concepts, data points, comparisons, and visual opportunities.
3. Present a numbered list of image suggestions. Format each as:

```
N. [TYPE] "Subject description" — ASPECT_RATIO
   Placement: After "Section Heading Name"
   Colors: color_key_1, color_key_2 (auto-selected)
```

Where:
- **TYPE** is `HERO` (exactly one, always first) or `INLINE`
- **Subject description** is a vivid, specific description of what the image should depict — focus on visual elements, shapes, spatial relationships
- **ASPECT_RATIO** is `16:9` for hero images, `4:3` or `16:9` for inline
- **Placement** is the section heading or paragraph the image follows
- **Colors** are auto-selected from the brand palette based on subject matter (user can override)

**Guidelines for suggesting images:**
- Always suggest exactly 1 HERO image first
- Suggest 3-6 inline images depending on post length
- Prioritize sections that discuss data, comparisons, frameworks, processes, or abstract concepts
- Avoid suggesting images for sections that are primarily text opinions or tool reviews (unless there's a clear visual concept)
- Subject descriptions should be concrete and visual — "three concentric circles labeled TAM/SAM/SOM with decreasing size" not "market sizing concept"

**Wait for user approval.** The user will approve, reject, or edit each suggestion. They may also add custom entries. Do not proceed to Phase 2 until the user confirms the final list.

### Phase 2 — Generate Images

For each approved image:

1. Create the output directory:
```bash
mkdir -p docs/blog-images/<post-slug>
```

2. Run the generation script:
```bash
python3 idea-fuel/skills/blog-image/scripts/generate-blog-image.py \
  "<subject description>" \
  "docs/blog-images/<post-slug>/<filename>.jpg" \
  --aspect <aspect_ratio> \
  --colors "<color_1>,<color_2>" \
  --size 2K
```

**File naming:**
- Hero: `hero.jpg`
- Inline: `inline-01-<kebab-descriptor>.jpg`, `inline-02-<kebab-descriptor>.jpg`, etc.
- Descriptors are short (2-4 words) kebab-case summaries of the subject

**Generate images one at a time**, showing each to the user as it completes (use the Read tool to display the image). This allows the user to catch style issues early before generating the full set.

### Phase 3 — Review & Insert

After all images are generated, present a summary:

```
## Generated Images for "<post-title>"

1. [HERO] hero.jpg — ✅ Approved / 🔄 Regenerate / ❌ Skip
2. [INLINE] inline-01-tam-sam-som.jpg — ✅ Approved / 🔄 Regenerate / ❌ Skip
...
```

For each image, display it and ask the user to approve, regenerate (with optional prompt tweaks), or skip.

**For approved images, provide insertion guidance:**

- **Hero image:** Provide the relative path for the `coverImage` field:
  ```
  Cover image path: docs/blog-images/<post-slug>/hero.jpg
  ```
  Note: The user will need to upload this to their hosting/CDN and update the blog post's `coverImage` field in the admin panel or database.

- **Inline images:** For each, provide:
  - The file path
  - The section heading it should be placed after
  - A TipTap image node snippet for insertion into post content:
  ```json
  {
    "type": "image",
    "attrs": {
      "src": "<url-after-upload>",
      "alt": "<descriptive alt text>",
      "title": null
    }
  }
  ```

## Brand Color Palette

| Key | Color | Hex | Use For |
|-----|-------|-----|---------|
| `brand_orange` | Brand orange/red | `#E32B1A` | Energy, CTAs, focal points, IdeaFuel product references |
| `electric_blue` | Electric blue | `#3B82F6` | Data, analytics, technology, trust |
| `purple` | Purple | `#6B21A8` | AI, innovation, intelligence, creativity |
| `teal` | Teal/green | `#14B8A6` | Growth, validation, success, positive outcomes |

Each image uses 2 colors from this palette plus charcoal grey for structure. The generation script auto-selects colors based on subject keywords, but the user can override with `--colors`.

## Style Reference

All images use the same marker-sketch style: hand-drawn alcohol marker rendering on pure white background, bold black contour lines, construction lines with crosshair markers, visible directional strokes, consistent upper-left lighting. See the full style prompt in `scripts/generate-blog-image.py`.

## Output Structure

```
docs/blog-images/
  <post-slug>/
    hero.jpg
    inline-01-<descriptor>.jpg
    inline-02-<descriptor>.jpg
    ...
```

## Tips

- If an image doesn't look right, try making the subject description more specific and visual before regenerating
- For diagrams and charts, explicitly describe the shape, layout, and spatial relationships
- The `--size 4K` flag produces higher quality but is slower — use for hero images if 2K isn't sharp enough
- Color override is useful when auto-selection picks the wrong mood for a subject

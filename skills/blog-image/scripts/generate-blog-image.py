#!/usr/bin/env python3
"""
Generate blog images in IdeaFuel's marker-sketch style using Gemini API.

Usage:
    python generate-blog-image.py "TAM SAM SOM concentric circles" output.jpg --aspect 16:9
    python generate-blog-image.py "Validation funnel diagram" output.jpg --aspect 4:3 --colors "electric_blue,purple"

Environment:
    GEMINI_API_KEY - Required API key
"""

import argparse
import os
import sys
from typing import Optional, Tuple

from google import genai
from google.genai import types


# ─── Brand Color Palette ────────────────────────────────────────────

COLORS = {
    "brand_orange": ("#E32B1A", "Brand orange/red"),
    "electric_blue": ("#3B82F6", "Electric blue"),
    "purple": ("#6B21A8", "Purple"),
    "teal": ("#14B8A6", "Teal/green"),
}

# Subject keyword → recommended (primary, secondary) color keys
COLOR_MAP = {
    "data": ("electric_blue", "brand_orange"),
    "analytics": ("electric_blue", "brand_orange"),
    "metrics": ("electric_blue", "brand_orange"),
    "charts": ("electric_blue", "brand_orange"),
    "graph": ("electric_blue", "brand_orange"),
    "ai": ("purple", "electric_blue"),
    "machine learning": ("purple", "electric_blue"),
    "intelligence": ("purple", "electric_blue"),
    "automation": ("purple", "electric_blue"),
    "growth": ("teal", "brand_orange"),
    "revenue": ("teal", "brand_orange"),
    "success": ("teal", "brand_orange"),
    "validation": ("teal", "brand_orange"),
    "product": ("brand_orange", "electric_blue"),
    "ideafuel": ("brand_orange", "electric_blue"),
    "app": ("brand_orange", "electric_blue"),
    "mobile": ("brand_orange", "electric_blue"),
    "competition": ("electric_blue", "purple"),
    "market": ("electric_blue", "purple"),
    "research": ("electric_blue", "purple"),
    "planning": ("purple", "teal"),
    "strategy": ("purple", "teal"),
    "roadmap": ("purple", "teal"),
    "money": ("teal", "brand_orange"),
    "pricing": ("teal", "brand_orange"),
    "financial": ("teal", "brand_orange"),
    "tam": ("electric_blue", "teal"),
    "sam": ("electric_blue", "teal"),
    "som": ("electric_blue", "teal"),
    "funnel": ("brand_orange", "teal"),
    "pipeline": ("brand_orange", "electric_blue"),
    "tool": ("electric_blue", "brand_orange"),
    "compare": ("purple", "brand_orange"),
}

# Default fallback colors
DEFAULT_COLORS = ("brand_orange", "electric_blue")


def select_colors(description: str) -> Tuple[str, str]:
    """Pick primary + secondary color keys based on subject keywords."""
    desc_lower = description.lower()
    for keyword, colors in COLOR_MAP.items():
        if keyword in desc_lower:
            return colors
    return DEFAULT_COLORS


# ─── Style Prompt ───────────────────────────────────────────────────

STYLE_PROMPT = """## Medium & Tools
- **Hand-drawn marker rendering** on white paper (sketchbook/marker paper)
- Primary tools appear to be: **alcohol-based markers** (like Copic or Prismacolor), **black fine-liner pens** (varying weights), **black ballpoint or felt-tip pen** for annotations, and **white gel pen or white paint marker** for highlights
- Possible use of **grey pencil or light blue underdrawing** visible beneath final lines as construction guides

## Color Palette & Rendering
- **Restricted but vibrant color palette** built from a brand color system
- For this image, use **{color_1_label} ({color_1_hex})** and **{color_2_label} ({color_2_hex})** as the two primary chromatic tones
- Grey tones are layered in **at least 3-4 values** — from light cool grey to near-black — built up through overlapping marker strokes
- Chromatic colors use **2-3 values each** — a mid-tone, a deeper shade for shadow, and a lighter tint for highlight transitions
- **No gradients to white on colored surfaces** — the lightest areas are achieved by leaving marker strokes slightly translucent or using paper white strategically
- The background is **pure flat white (#FFFFFF)** — completely clean, no paper texture, no grain, no environmental rendering, no atmospheric effects, no gradients, no contextual backgrounds

## Line Work
- **Bold, confident outer contour lines** in black — thicker weight (approximately 0.5-0.8mm equivalent), slightly varying in pressure giving a hand-drawn energy
- **Thinner internal detail lines** for subdivisions, data labels, chart axes, and structural elements (approximately 0.2-0.3mm)
- Lines are **slightly loose and sketchy** but controlled — not perfectly straight, retaining hand-drawn character with occasional overshoot at intersections
- **Cross-hatch construction lines** extend beyond the main composition — light, thin lines showing grids, axes, and reference guides drawn in fine grey or light pen
- Construction lines use **small arrowheads** at their endpoints and **small "x" marks** or crosshairs at key reference points
- **No perfectly ruled/mechanical lines** — everything retains a freehand quality

## Perspective & Composition
- Compositions rendered in a **clear, readable layout** — the subject matter should be instantly comprehensible
- For charts/diagrams: **slightly angled** (5-15 degrees from straight-on) to add sketch energy, not rigidly aligned
- For conceptual illustrations: **three-quarter or isometric perspective** showing depth and dimension
- The subject dominates the composition at **large scale**, filling 70-80% of the image
- Composition is deliberately **confident** — clean visual hierarchy with a single clear focal point

## Surface Rendering Technique
- **Broad, visible marker strokes** that follow form direction — strokes are not blended to invisibility; individual stroke marks remain partially visible, contributing to the sketch aesthetic
- **Shadow and light logic is consistent** — light source from upper-left, shadows on lower-right
- **Reflected light** suggested on dark shadow surfaces using a slightly lighter marker pass
- **Specular highlights** rendered with **white gel pen or paint marker** as sharp, thin streaks and dots along edges and surface transitions
- **Surface transitions between planes** marked with distinct value shifts
- For data visualizations (charts, graphs): bars, slices, and areas filled with **visible directional marker strokes** in the brand colors, not flat digital fills

## Dimensional/Technical Drawing Elements
- **Thin construction/guide lines** extend outward showing alignment, axes, and measurement references
- Small **"x" crosshair markers** at key data points, intersections, and structural centers
- **Dimension arrows** (double-headed) occasionally shown for scale and proportion
- These technical elements drawn in **lighter line weight** than the subject, creating clear visual hierarchy

## What to Explicitly AVOID
- No background rendering, no environment, no surface the subject sits on
- No water droplets, splashes, smoke, steam, sparks, motion blur, or atmospheric effects
- No cast shadows on a ground plane
- No decorative elements, lifestyle context, or human figures (unless the subject specifically calls for simple silhouettes)
- No digital glow effects, lens flares, or bloom
- No photorealistic rendering — maintain a clear **hand-sketched marker rendering** aesthetic
- No soft airbrush-style blending — strokes should remain visible and directional
- No colors outside the specified palette for this image
- No actual readable body text — use wavy lines or rough letter shapes for any text content within the illustration
- No emojis, clip art, or stock illustration elements

## Overall Impression
The style is that of a **professional editorial concept sketch** — the kind produced in a strategy consultancy or design studio to illustrate business concepts. It balances **clarity with artistic looseness**, communicating ideas, data, and relationships while maintaining the energy and spontaneity of hand sketching. The restricted color palette gives it a **cohesive brand-like quality**.

## Subject
{description}

## Image Format
- Generate the image with a **{aspect_ratio} aspect ratio**
- The background must be **pure white (#FFFFFF)** with no texture, grain, or off-white tones

## Annotations
- Do NOT include any text labels, annotations, callouts, leader lines, or written descriptions
- The drawing should be purely visual — no handwritten text of any kind"""


def build_prompt(description: str, aspect_ratio: str, color_keys: Tuple[str, str]) -> str:
    """Assemble the full prompt from style template + subject + colors."""
    c1_hex, c1_label = COLORS[color_keys[0]]
    c2_hex, c2_label = COLORS[color_keys[1]]

    return STYLE_PROMPT.format(
        color_1_label=c1_label,
        color_1_hex=c1_hex,
        color_2_label=c2_label,
        color_2_hex=c2_hex,
        description=description,
        aspect_ratio=aspect_ratio,
    )


def generate_blog_image(
    description: str,
    output_path: str,
    aspect_ratio: str = "16:9",
    color_override: Optional[Tuple[str, str]] = None,
    model: str = "gemini-3-pro-image-preview",
    image_size: str = "2K",
) -> Optional[str]:
    """Generate a blog image and save it.

    Args:
        description: What the image should depict
        output_path: Where to save the image (.jpg)
        aspect_ratio: 4:3 or 16:9
        color_override: Optional (primary_key, secondary_key) to override auto-selection
        model: Gemini model ID
        image_size: Resolution (1K, 2K, 4K)

    Returns:
        Any text response from the model, or None
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY environment variable not set")

    colors = color_override or select_colors(description)
    prompt = build_prompt(description, aspect_ratio, colors)

    client = genai.Client(api_key=api_key)

    config = types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
            image_size=image_size,
        ),
    )

    response = client.models.generate_content(
        model=model,
        contents=[prompt],
        config=config,
    )

    text_response = None
    image_saved = False

    for part in response.parts:
        if part.text is not None:
            text_response = part.text
        elif part.inline_data is not None:
            image = part.as_image()
            image.save(output_path)
            image_saved = True

    if not image_saved:
        raise RuntimeError("No image was generated. Check your prompt and try again.")

    return text_response


def main():
    parser = argparse.ArgumentParser(
        description="Generate blog images in IdeaFuel marker-sketch style",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("description", help="What the image should depict")
    parser.add_argument("output", help="Output file path (e.g., hero.jpg)")
    parser.add_argument(
        "--aspect", "-a",
        choices=["4:3", "16:9"],
        default="16:9",
        help="Aspect ratio (default: 16:9)",
    )
    parser.add_argument(
        "--colors", "-c",
        help="Comma-separated color keys to override auto-selection (e.g., electric_blue,purple)",
    )
    parser.add_argument(
        "--size", "-s",
        choices=["1K", "2K", "4K"],
        default="2K",
        help="Image resolution (default: 2K)",
    )
    parser.add_argument(
        "--model", "-m",
        default="gemini-3-pro-image-preview",
        help="Gemini model (default: gemini-3-pro-image-preview)",
    )

    args = parser.parse_args()

    color_override = None
    if args.colors:
        parts = args.colors.split(",")
        if len(parts) != 2 or any(p.strip() not in COLORS for p in parts):
            valid = ", ".join(COLORS.keys())
            print(f"Error: --colors must be two comma-separated keys from: {valid}", file=sys.stderr)
            sys.exit(1)
        color_override = (parts[0].strip(), parts[1].strip())

    try:
        text = generate_blog_image(
            description=args.description,
            output_path=args.output,
            aspect_ratio=args.aspect,
            color_override=color_override,
            model=args.model,
            image_size=args.size,
        )
        print(f"Image saved to: {args.output}")
        if text:
            print(f"Model response: {text}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

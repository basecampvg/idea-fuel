# Glossary Library Design Spec

## Overview

A massive, SEO-first glossary of 200-300 startup, marketing, and business validation terms — modeled after Mobbin's glossary pattern but tailored to IdeaFuel's domain. Content is AI-generated at build time via subagent batches of 10, stored as static JSON files, and rendered as fully static Next.js pages.

## Goals

1. **SEO**: Rank for hundreds of long-tail "what is [term]" searches. Drive organic traffic to IdeaFuel.
2. **Education**: Genuinely useful founder-focused content that builds trust and authority.
3. **Product tie-in**: Contextual inline mentions + bottom CTA on every term page.

## Data Architecture

### Master Config (`packages/web/src/data/glossary/terms-config.json`)

Source of truth for all terms. Array of objects:

```json
{
  "slug": "product-market-fit",
  "title": "Product-Market Fit",
  "category": "strategy",
  "relatedTerms": ["tam", "customer-discovery", "minimum-viable-product"],
  "ideafuelFeature": "research-engine"
}
```

**Categories:** `strategy`, `marketing`, `finance`, `growth`, `product`, `analytics`, `fundraising`.

### Generated Term Files (`packages/web/src/data/glossary/terms/{slug}.json`)

One file per term, written by subagents. Schema:

```json
{
  "slug": "product-market-fit",
  "title": "Product-Market Fit",
  "category": "strategy",
  "shortDefinition": "The degree to which a product satisfies strong market demand.",
  "content": {
    "definition": "Full 2-3 sentence definition...",
    "whyItMatters": "Why founders need to understand this...",
    "howToApply": "Practical steps or formula...",
    "commonMistakes": ["Mistake 1...", "Mistake 2..."],
    "ideafuelConnection": "IdeaFuel's Research Engine helps you measure PMF by..."
  },
  "relatedTerms": ["tam", "customer-discovery", "minimum-viable-product"],
  "synonyms": ["PMF"],
  "seoTitle": "What is Product-Market Fit? | IdeaFuel Glossary",
  "seoDescription": "Learn what Product-Market Fit means, how to measure it, and common mistakes founders make."
}
```

**Design decisions:**
- Flat files, no nesting, no dependencies between terms. Each subagent batch writes 10 independent files with zero merge conflicts.
- The index page reads all files from the directory at build time.
- `ideafuelConnection` is optional — only rendered when present.

## Pages

### Index Page (`/glossary`)

**Route:** `packages/web/src/app/(public)/glossary/page.tsx`

**Layout (top to bottom):**

1. **Hero Section** — Large heading "Glossary" with subtext: "The founder's dictionary. 250+ terms every entrepreneur should know." Matches blog/docs hero pattern.

2. **Search Bar** — Client-side real-time filter. Searches across term titles and short definitions. No backend.

3. **Category Filter Pills** — Horizontal pill buttons: "All", "Strategy", "Marketing", "Finance", "Growth", "Product", "Analytics", "Fundraising". Active pill = solid fill, inactive = border-only. Matches blog tag filter pattern.

4. **Alphabetical Term List** — Grouped by letter with H2 headings. Each term renders as a clickable row showing:
   - Term title (bold)
   - Short definition (one line, truncated)
   - Category badge (small pill)
   - Whole row links to `/glossary/{slug}`

5. **Sticky Alphabet Nav** — Right-side vertical strip of letter buttons. Clicking scrolls to that letter section. Letters without terms are dimmed/disabled.

**Data fetching:** Reads all term JSON files at build time. `force-static` export.

**SEO:** Static metadata: "Startup & Marketing Glossary | IdeaFuel". JSON-LD: `DefinedTermSet`.

### Term Page (`/glossary/[slug]`)

**Route:** `packages/web/src/app/(public)/glossary/[slug]/page.tsx`

**Layout (top to bottom):**

1. **Breadcrumb** — `Glossary / Product-Market Fit`

2. **Header Block:**
   - H1: term title
   - Category badge pill
   - Synonyms line (if any): "Also known as: PMF"

3. **Content Sections** (each is a distinct visual block with H2):
   - **"What is [Term]?"** — 2-3 sentence definition. Primary SEO target.
   - **"Why It Matters"** — Why founders should care.
   - **"How to Apply"** — Steps, formula, or framework. May include numbered lists or calculation examples.
   - **"Common Mistakes"** — Bulleted list of 2-4 pitfalls. Good for featured snippets.
   - **"How IdeaFuel Helps"** — Contextual product tie-in. Only rendered if `ideafuelConnection` exists.

4. **Related Terms** — Row of clickable pill chips (`rounded-full`, border, hover effect) linking to other glossary term pages.

5. **Bottom CTA** — Card/banner: "Ready to validate your idea?" with signup/dashboard button. Every term page.

6. **Prev/Next Navigation** — Alphabetical prev/next links at the bottom.

**SEO per page:**
- `generateMetadata()` returns `seoTitle` and `seoDescription` from term JSON.
- JSON-LD: `DefinedTerm` schema with `name`, `description`, `inDefinedTermSet`.
- `generateStaticParams()` reads all slugs from the data directory.

## Components

### New Files

**`packages/web/src/lib/glossary.ts`** — Utility functions + TypeScript types:
- `GlossaryTerm` interface matching the JSON schema
- `getAllTerms()` — reads all JSON files, returns sorted array
- `getTermBySlug(slug)` — reads a single term
- `getTermsByCategory(category)` — filters by category
- `getAlphabetGroups(terms)` — groups terms by first letter

**`packages/web/src/components/glossary/`:**
- `glossary-search.tsx` — Client component. Search input with real-time filtering.
- `glossary-category-filter.tsx` — Client component. Category pill buttons.
- `glossary-alphabet-nav.tsx` — Sticky right-side letter nav with scroll-to behavior.
- `glossary-term-card.tsx` — Term row/card for index listing (title, definition, category badge).
- `glossary-related-chips.tsx` — Clickable pill chips for related terms.
- `glossary-cta.tsx` — Bottom CTA banner.

### Existing Components Used
- `Badge` from `components/ui/` for category pills
- `Button` from `components/ui/` for CTA

### Nav Update
Add "Glossary" link to the public layout header (`packages/web/src/app/(public)/layout.tsx`) alongside Blog and Docs.

## Generation Pipeline

### Execution via Claude Code Subagents

Content generation is done by dispatching Claude Code Agent tool subagents during implementation — not via a standalone Node script. The orchestrating agent:
1. Reads `terms-config.json`
2. Chunks terms into batches of 10
3. For each batch, spawns a subagent with a prompt containing:
   - The 10 term configs (slug, title, category, related terms, ideafuel feature)
   - Output JSON schema
   - Tone/style guidelines
   - IdeaFuel feature mapping
4. Each subagent writes 10 individual `{slug}.json` files

### Subagent Prompt Guidelines
- **Tone:** Direct, practical, founder-focused. No fluff. Written for someone building a business, not studying for an exam.
- **Word count:** 500-800 words total per term.
- **SEO title pattern:** "What is [Term]? | IdeaFuel Glossary"
- **SEO description:** Natural 150-character summary.
- **`ideafuelConnection`:** Only include when the mapped feature genuinely relates to the term.

### Execution Properties
- **Idempotent:** If a term file already exists, skip it. `--force` flag to regenerate specific slugs or all.
- **Validation:** Post-generation script checks all files parse as valid JSON with all required fields.
- **Execution flow:** Orchestrating agent dispatches 25-30 subagent batches (sequentially to avoid context rot) → 250 JSON files written → build site → done.

## Styling Conventions

Follows existing IdeaFuel design system:
- Dark background: `#0A0A0A`
- Borders: `#333`
- Pill buttons: `rounded-full`
- Container: `max-w-6xl`
- Typography: `font-display` for headings, `font-extrabold` for H1
- Hover effects: subtle border glow, scale transitions
- Spacing: `px-6` horizontal, `py-12`/`py-16` vertical

## Content Scope

**Target: 200-300 terms** across 7 categories:
- **Strategy:** TAM, SAM, SOM, Product-Market Fit, Competitive Moat, Blue Ocean, Value Proposition, Pivot, etc.
- **Marketing:** CAC, LTV, SEO, Content Marketing, Conversion Rate, Funnel, A/B Testing, etc.
- **Finance:** Unit Economics, Burn Rate, Runway, Revenue Model, MRR, ARR, Gross Margin, etc.
- **Growth:** Viral Coefficient, Retention Rate, Churn, Network Effects, Growth Hacking, etc.
- **Product:** MVP, User Story, Sprint, Agile, Feature Prioritization, Roadmap, etc.
- **Analytics:** Cohort Analysis, DAU/MAU, Engagement Rate, Attribution, etc.
- **Fundraising:** Pre-seed, Seed, Series A, Term Sheet, Cap Table, Dilution, SAFE, etc.

# Meta Ads Content Engine — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Localhost-only internal tool for generating, editing, and exporting Meta ad creatives

---

## Overview

A campaign workspace inside the IdeaFuel dashboard where you describe an ad angle/audience to an AI chat, it generates multiple typographic ad concepts, each concept renders across all Meta ad sizes as React cards, you can inline-edit the copy, and bulk export everything as PNG/JPG.

## Constraints

- Localhost only — no auth, multi-tenancy, or public API concerns
- Brand fonts and colors exclusively (Outfit, Geist, Geist Mono; #0A0A0A bg, #E32B1A accent)
- Typographic ads only — no product screenshots or stock photos, text IS the creative
- Extensible for future effects libraries (not in scope now)

---

## Data Model

### Campaign

Top-level container for a set of ad concepts generated around a theme.

| Field         | Type       | Notes                                      |
|---------------|------------|--------------------------------------------|
| id            | text (cuid)| Primary key                                |
| userId        | text       | FK to users                                |
| name          | text       | Campaign name/theme                        |
| description   | text       | The angle/audience description             |
| chatMessages  | jsonb      | ChatMessage[] — full conversation history  |
| createdAt     | timestamp  |                                            |
| updatedAt     | timestamp  |                                            |

### AdConcept

One creative idea within a campaign. Renders across all 5 sizes automatically.

| Field         | Type       | Notes                                      |
|---------------|------------|--------------------------------------------|
| id            | text (cuid)| Primary key                                |
| campaignId    | text       | FK to Campaign                             |
| headline      | text       | Bold display text, may contain `{{accent}}word{{/accent}}` markup |
| body          | text       | Subline/supporting copy, same accent markup|
| logoPosition  | enum       | `'top'` or `'bottom'`                      |
| layout        | enum       | `'headline-subline'` or `'centered-body'`  |
| order         | integer    | Sort order within campaign                 |
| createdAt     | timestamp  |                                            |
| updatedAt     | timestamp  |                                            |

**Accent markup:** `{{accent}}key phrase{{/accent}}` stored in headline/body text. The card renderer parses this and wraps in `<span>` with brand red color. Keeps data plain-text friendly.

**No per-size records.** Sizes are a rendering concern — each concept renders across all 5 formats from the same data.

---

## Ad Sizes

| Name       | Dimensions  | Use Case              |
|------------|-------------|-----------------------|
| Feed       | 1080×1080   | Facebook/Instagram feed (square) |
| Portrait   | 1080×1350   | Feed (4:5 vertical)   |
| Story      | 1080×1920   | Stories/Reels (9:16)  |
| Carousel   | 1080×1080   | Carousel slides       |
| Landscape  | 1200×628    | Right column/link ads |

Feed and Carousel are both 1080×1080 but separate components — carousel cards may need different layout defaults (tighter margins, smaller text for series context).

---

## Routes

- `/campaigns` — list all campaigns
- `/campaigns/[id]` — campaign workspace (the main UI)

Both inside the existing `(dashboard)` layout.

---

## Component Architecture

### Workspace Layout

Split-pane view at `/campaigns/[id]`:

```
CampaignWorkspace
├── CampaignChat (left panel)
│   ├── ChatMessages (reuses AgentMessage pattern)
│   └── ChatInput
│
└── AdCanvas (right panel — the orchestrator)
    ├── CanvasToolbar
    │   ├── ViewToggle (grid view vs single-concept view)
    │   ├── ExportButton (bulk export controls)
    │   └── SizeFilter (show/hide specific sizes)
    │
    └── ConceptGroup (one per ad concept)
        ├── ConceptHeader (concept name, delete, reorder, layout toggle)
        └── AdCard × 5 sizes
            ├── AdCardFeed (1080×1080)
            ├── AdCardPortrait (1080×1350)
            ├── AdCardStory (1080×1920)
            ├── AdCardCarousel (1080×1080)
            └── AdCardLandscape (1200×628)
```

### AdCard Internals

Each size variant:

```
AdCard
├── LogoMark (positioned top or bottom, clickable to toggle)
├── EditableHeadline (contentEditable, renders accent markup as colored spans)
├── EditableBody (contentEditable, renders accent markup as colored spans)
└── hidden export ref (full-resolution DOM node for html-to-image capture)
```

### Rendering Strategy

Each card has two DOM nodes:
- **Preview node** — visible on screen, CSS `transform: scale()` to fit the layout
- **Export node** — hidden off-screen (`position: absolute; left: -9999px`), rendered at full pixel dimensions

Export captures the hidden node for pixel-perfect output regardless of screen zoom.

---

## AI Chat → Card Data Flow

### Interaction Model

1. User describes campaign angle/audience in chat
2. Chat endpoint calls Claude with system prompt instructing structured JSON output
3. AI returns concepts via tool calling (`generate_ad_concepts` tool)
4. Frontend parses tool-use result and pushes new concepts into state
5. User can iterate: "make the headline punchier", "try targeting side hustlers"

### Tool Definition

```typescript
generate_ad_concepts: {
  description: "Generate ad copy concepts for a Meta ads campaign",
  parameters: {
    concepts: [{
      headline: string,       // e.g. "YOU'VE BEEN THINKING ABOUT THIS IDEA FOR MONTHS."
      body: string,           // e.g. "DON'T LET YOUR IDEAS DIE."
      accentWords: string[],  // e.g. ["FOR MONTHS.", "IDEAS"]
      logoPosition: "top" | "bottom",
      layout: "headline-subline" | "centered-body"
    }]
  }
}
```

The `accentWords` array from the AI response gets converted to `{{accent}}...{{/accent}}` markup in the stored headline/body text.

### State Management

Campaign state lives in a React context (`CampaignContext`) at the workspace level:

```typescript
{
  campaign: Campaign,
  concepts: AdConcept[],
  updateConcept: (id, partial) => void,  // inline edits on cards
  addConcepts: (concepts[]) => void,     // from AI generation
  removeConcept: (id) => void,
  reorderConcepts: (ids[]) => void,
}
```

Mutations sync to the database via tRPC. Optimistic updates for snappy inline editing.

---

## Inline Editing

### Text Editing

- `contentEditable` divs for headline and body text
- Click to edit, blur to save
- Accent spans rendered as `<span class="text-primary font-bold">word</span>` in the DOM
- On blur: innerHTML parsed back to `{{accent}}...{{/accent}}` markup, `updateConcept()` called

### Accent Toggle

- Select text, press `Cmd+E` (or floating toolbar button)
- Wraps/unwraps selection in accent span
- Same UX pattern as bold toggle in a rich text editor

### Other Interactions

- **Logo position:** Click logo on any card to cycle top/bottom (updates concept)
- **Layout switch:** Toggle on ConceptHeader, flips between `headline-subline` and `centered-body` (concept-level, applies to all sizes)

### Not Editable on Card

- Font sizes (determined by size variant + layout, each card has its own typographic scale)
- Background color (always #0A0A0A)
- Logo design (always IdeaFuel mark)

---

## Export System

### Dependencies

- `html-to-image` — DOM node to PNG/JPG blob
- `jszip` — bundle images into a zip archive
- `file-saver` — trigger browser download

All client-side. No server involvement.

### Export Flows

1. **Export all** — every concept × every size → zip download
2. **Selective** — checkboxes per concept + size filter in toolbar → zip download
3. **Per-concept** — export button on ConceptHeader → zip with all 5 sizes for that concept

### Format

Toggle between PNG (default, lossless) and JPG (smaller, configurable quality). Both natively supported by html-to-image.

### File Structure

```
{campaign-name}/
  {concept-index}-{headline-slug}/
    feed-1080x1080.png
    portrait-1080x1350.png
    story-1080x1920.png
    carousel-1080x1080.png
    landscape-1200x628.png
```

---

## Brand System

All cards use existing CSS variables and font definitions. No hardcoded values.

| Element        | Token                          | Value         |
|----------------|--------------------------------|---------------|
| Background     | `--brand-bg`                   | #0A0A0A       |
| Accent text    | `hsl(var(--primary))`          | #E32B1A       |
| Body text      | white                          | #FFFFFF        |
| Display font   | `var(--font-display)` (Outfit) | Headlines     |
| Body font      | `var(--font-sans)` (Geist)     | Sublines      |
| Logo font      | `var(--font-mono)` (Geist Mono)| IDEA FUEL mark|

---

## Backend

### tRPC Router: `metaAds.ts`

- `list` — list all campaigns for user
- `get` — get campaign with concepts
- `createCampaign` — create new campaign
- `updateCampaign` — update name/description
- `deleteCampaign` — delete campaign and concepts
- `addConcepts` — bulk insert concepts from AI
- `updateConcept` — update single concept (inline edits)
- `removeConcept` — delete a concept
- `reorderConcepts` — update order values

### Database Schema Additions

Two new tables in `packages/server/src/db/schema.ts`:
- `campaigns` table
- `adConcepts` table

Two new enums:
- `LogoPosition` — `'top' | 'bottom'`
- `AdLayout` — `'headline-subline' | 'centered-body'`

### Chat Route: `/api/campaigns/chat`

Dedicated streaming endpoint (not reusing `/api/agent/chat`) because it needs:
- The `generate_ad_concepts` tool definition
- Campaign-specific system prompt with brand voice instructions
- Campaign context (existing concepts) in the conversation

Follows the same pattern: `streamText` from Vercel AI SDK, `convertToModelMessages`, auth check.

### AI Service: `meta-ads-ai.ts`

System prompt for Claude that:
- Understands IdeaFuel's brand voice (Mark Manson blunt + Peter Thiel contrarian)
- Returns structured concepts via tool calling
- Handles iterative refinement ("make it punchier", "try a different angle")

Uses Haiku for speed (copy generation doesn't need Opus).

---

## Out of Scope (Future)

- Effects libraries (animations, gradients, textures on cards)
- Background image support
- Video ad formats
- Direct Meta Ads API integration (uploading to ad manager)
- Multi-brand support (other products beyond IdeaFuel)
- Collaboration / sharing

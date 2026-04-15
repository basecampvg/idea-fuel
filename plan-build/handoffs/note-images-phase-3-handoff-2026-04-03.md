# Note Images Phase 3 Handoff — AI Vision Integration

**Date:** 2026-04-03
**Phase:** 3 of 3
**Status:** Complete

## What Changed

### 1. `packages/server/src/services/note-ai.ts` — `refineNote()` now accepts images

- **Signature updated:** `refineNote(content: string, imageUrls?: string[]): Promise<NoteRefinement>`
- When `imageUrls` is provided and non-empty, the user message is built as an array of content blocks:
  - Image blocks (`type: 'image'`, `source.type: 'url'`) are added first so the model processes visuals before the text prompt.
  - A single text block with the original refinement prompt follows.
- When no images are provided, the function behaves exactly as before (plain string message) — fully backward compatible.
- **System prompt updated** to include: "You may also receive images (screenshots, whiteboards, sketches). Incorporate visual context into your analysis."

### 2. `packages/server/src/routers/note.ts` — `note.refine` mutation passes images to AI

- After fetching the note and validating content length, the mutation now queries `noteAttachments` for the note's image attachments.
- Constructs Supabase public URLs: `${SUPABASE_URL}/storage/v1/object/public/project-attachments/${storagePath}`
- Passes the URL array to `refineNote(note.content, imageUrls)`.
- All necessary imports (`noteAttachments`, `ATTACHMENT_BUCKET`, `eq`) were already present from Phase 1/2.

## What Was Already In Place (from Phase 1/2)

- `noteAttachments` table and schema definition in `schema.ts`
- `noteAttachments` import in `note.ts`
- `ATTACHMENT_BUCKET` and `supabase` imports in `note.ts`
- Attachment CRUD mutations (add/remove) in the note router
- Storage cleanup in the delete mutation

## Type Check

- `tsc --noEmit` passes for both modified files (0 errors in `note-ai.ts` and `note.ts`).
- 10 pre-existing errors in unrelated blog content scripts remain unchanged.

## Testing Notes

- To test end-to-end: create a note, attach an image via the attachment mutation, write 50+ chars of content, then call `note.refine`. The AI response should reference visual content from the attached image.
- Without attachments, refinement works identically to before (regression-safe).
- The `SUPABASE_URL` env var must be set for image URLs to be constructed. If missing, images are silently skipped (no crash).

## Files Modified

- `/packages/server/src/services/note-ai.ts` — refineNote signature + multimodal content blocks + system prompt
- `/packages/server/src/routers/note.ts` — attachment fetch + URL construction in refine mutation

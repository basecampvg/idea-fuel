# Note Images Phase 2 Handoff — Server Note Router Updates

**Date:** 2026-04-03
**File modified:** `packages/server/src/routers/note.ts`

## What was done

### 1. New imports added
- `count` from `drizzle-orm`
- `addNoteAttachmentsSchema`, `removeNoteAttachmentSchema` from `@forge/shared`
- `noteAttachments`, `projectAttachments` from `../db/schema`
- `supabase`, `ATTACHMENT_BUCKET` from `../lib/supabase`

### 2. `note.get` — updated to include attachments
- Added `with: { attachments: true }` to the `findFirst` query so the returned note now includes an `attachments` array via Drizzle's relational query API.

### 3. `note.delete` — storage cleanup before deletion
- Before deleting the note, queries `noteAttachments` for all storage paths.
- Calls `supabase.storage.from(ATTACHMENT_BUCKET).remove(...)` to delete the files.
- Wrapped in try/catch — logs a warning on failure but does not block the note deletion.
- The cascade FK handles DB row cleanup automatically.

### 4. `note.promote` — copies attachments to new project
- Inside the transaction, after creating the project, queries noteAttachments ordered by `order`, limited to 5.
- Inserts `projectAttachments` rows re-using the same `storagePath` values (no re-upload).
- Order field remapped to 0-4 based on array index.

### 5. `note.addAttachments` mutation (new)
- Input: `addNoteAttachmentsSchema` (`{ noteId, attachments[] }`)
- Ownership check on the note.
- Counts existing attachments, rejects if total would exceed 10.
- Inserts `noteAttachments` rows with userId from ctx.
- Returns `{ success: true }`.

### 6. `note.removeAttachment` mutation (new)
- Input: `removeNoteAttachmentSchema` (`{ attachmentId }`)
- Finds attachment by id + userId ownership check.
- Deletes from Supabase Storage (logs warning on failure, does not throw).
- Deletes the DB row.
- Returns `{ success: true }`.

### 7. Linter-applied change (automatic)
- The `refine` mutation was updated by a linter/hook to fetch note image attachment URLs and pass them to `refineNote()` as `imageUrls`. This enables vision-aware refinement when images are attached.

## Type check results
- No new TypeScript errors introduced. The 10 pre-existing errors are all in `src/scripts/blog-content/` (unrelated ListItemNode type issue).

## What's next (Phase 3)
- Mobile UI: Add image picker/camera to note editor screen
- Upload flow: Use `attachment.getUploadUrl` to get presigned URL, upload to Supabase Storage, then call `note.addAttachments`
- Display: Show attachment thumbnails in note detail/editor
- Remove: Swipe-to-delete or X button calling `note.removeAttachment`
- Update tRPC client types (should auto-infer from router changes)

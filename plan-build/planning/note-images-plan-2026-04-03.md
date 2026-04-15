# Build Plan: Note Image Attachments
**Created:** 2026-04-03
**Spec:** ../specs/note-images-spec-2026-04-03.md
**Status:** Draft
**Project type:** Existing codebase

## Overview
Add image attachments to notes. Users can capture/pick images, see them in a thumbnail strip below the note header, and the AI refinement pipeline analyzes them via vision. Images carry over when a note is promoted to a project.

## Component Inventory

| Component | Inputs | Outputs | External Deps |
|-----------|--------|---------|---------------|
| `NoteAttachment` table (schema.ts) | noteId, storagePath, metadata | DB rows | PostgreSQL |
| `noteAttachmentMetadataSchema` (shared validators) | — | Zod schema | — |
| `note.addAttachments` mutation | noteId, attachment metadata[] | success | DB |
| `note.removeAttachment` mutation | attachmentId | success | DB + Supabase Storage |
| `note.get` query (update) | noteId | note + attachments[] | DB |
| `note.promote` mutation (update) | noteId | copies to projectAttachments | DB |
| `refineNote()` service (update) | content + image URLs | refinement | Anthropic API (vision) |
| Note editor screen (update) | — | image picker + strip UI | expo-image-picker |
| `ThumbnailStrip` component (reuse) | LocalAttachment[] | renders thumbnails | — |
| `AttachmentPopover` component (reuse) | — | Camera/Photos options | — |

## Integration Contracts

### Note Editor → `attachment.getUploadUrl`
- **What flows:** fileName, mimeType per image
- **How:** Existing tRPC mutation (no changes needed)
- **Returns:** uploadUrl, storagePath, token

### Note Editor → Supabase Storage
- **What flows:** Image blob via PUT to signedUrl
- **How:** Direct fetch upload (existing pattern from capture.tsx)

### Note Editor → `note.addAttachments`
- **What flows:** `{ noteId, attachments: [{ storagePath, fileName, mimeType, sizeBytes, order }] }`
- **How:** New tRPC mutation, called after all uploads complete

### Note Editor → `note.removeAttachment`
- **What flows:** `{ attachmentId }`
- **How:** New tRPC mutation, deletes DB row + storage file

### `note.get` → Note Editor
- **What flows:** Note data + `attachments: NoteAttachment[]`
- **Returns:** Each attachment has `id, storagePath, fileName, mimeType, sizeBytes, order`
- **Display URL:** Client constructs Supabase public URL from `storagePath` using the known bucket URL pattern

### `note.promote` → `projectAttachments`
- **What flows:** Copies first 5 note attachments → projectAttachments rows
- **How:** Within existing transaction, insert into projectAttachments with new projectId

### `refineNote()` → Anthropic API
- **What flows:** Text content + image URLs as vision content blocks
- **How:** Pass attachment public URLs as `image` content blocks in the messages array
- **Model:** Claude Haiku (already used, supports vision)

## End-to-End Flows

### Flow 1: Attach Images
1. User taps image icon in header pill
2. `AttachmentPopover` shows Camera/Photos options
3. User picks images via expo-image-picker
4. Local URIs added to component state → `ThumbnailStrip` renders immediately
5. For each image: `attachment.getUploadUrl` → PUT to signedUrl
6. After all uploads: `note.addAttachments` → DB rows created
7. `note.get` cache invalidated → re-fetches with attachments

### Flow 2: Remove Image
1. User taps X on thumbnail
2. Optimistic removal from local state
3. If attachment has a DB id (already saved): `note.removeAttachment` → deletes row + storage file
4. If attachment is still uploading (no DB id): cancel/ignore, remove from local state

### Flow 3: Refine with Images
1. Auto-refine triggers (3s typing pause, >= 50 chars)
2. `note.refine` reads note content + fetches note attachments from DB
3. Constructs Supabase public URLs for each attachment
4. Calls Anthropic API with text + image content blocks
5. Returns refinement as before (title, description, tags)

### Flow 4: Promote with Images
1. User promotes note → `note.promote` fires
2. Transaction: create project, mark note promoted
3. Query noteAttachments for this note
4. Insert first 5 as projectAttachments (re-using same storagePaths — no re-upload)
5. Delete note (cascade deletes noteAttachments rows, but storage files persist since projectAttachments reference them)

## Convention Guide
- Follow existing patterns from `projectAttachments` table for schema
- Follow existing patterns from `capture.tsx` for image picking + upload
- Follow existing `ThumbnailStrip` component for display
- Follow existing `AttachmentPopover` for camera/photos menu
- kebab-case files, PascalCase components, camelCase functions

## Wiring Checklist

### Phase 1: Database + Shared Validators
- [ ] Add `NoteAttachment` table to `packages/server/src/db/schema.ts` (mirror projectAttachments, noteId FK instead of projectId)
- [ ] Add `noteAttachmentsRelations` to schema.ts (one → note, one → user)
- [ ] Add `attachments: many(noteAttachments)` to `notesRelations`
- [ ] Add `noteAttachmentMetadataSchema` to `packages/shared/src/validators/index.ts` (like attachmentMetadataSchema but order 0-9)
- [ ] Add `addNoteAttachmentsSchema` and `removeNoteAttachmentSchema` validators
- [ ] Run `pnpm db:generate` to create migration
- [ ] Run `pnpm db:push` to apply

### Phase 2: Server — Note Router Updates
- [ ] Add `note.addAttachments` mutation: validate note ownership, insert NoteAttachment rows
- [ ] Add `note.removeAttachment` mutation: validate ownership, delete row + delete from Supabase Storage
- [ ] Update `note.get` to include attachments via Drizzle `with: { attachments: true }` or join
- [ ] Update `note.promote` to copy first 5 note attachments → projectAttachments in the transaction
- [ ] Update `note.delete` — verify cascade deletes noteAttachment rows (FK onDelete cascade handles this)

### Phase 3: Server — AI Vision Integration
- [ ] Update `refineNote()` in `note-ai.ts` to accept optional image URLs parameter
- [ ] Construct Supabase public URLs from storagePaths
- [ ] Build Anthropic messages with `image` content blocks (type: "image", source: { type: "url", url })
- [ ] Update `note.refine` mutation to fetch attachments and pass URLs to `refineNote()`

### Phase 4: Mobile — Note Editor UI
- [ ] Add image icon (`ImagePlus` from lucide) to header pill in `notes/[id]/index.tsx`
- [ ] Add `AttachmentPopover` state + handlers (reuse component)
- [ ] Add camera + photo library handlers (follow capture.tsx pattern exactly)
- [ ] Add local attachments state (pre-upload) + saved attachments state (from DB)
- [ ] Render `ThumbnailStrip` below header (update component to support max=10 via prop)
- [ ] Wire upload flow: getUploadUrl → PUT to storage → addAttachments mutation
- [ ] Wire remove flow: optimistic removal + removeAttachment mutation
- [ ] Disable image button when 10 attachments reached
- [ ] Invalidate note.get cache after add/remove

## Build Order

1. **Phase 1: Database + Shared** — Schema + validators (foundation, everything depends on this)
2. **Phase 2: Server Routes** — CRUD mutations + query updates (needed before mobile can call them)
3. **Phase 3: AI Vision** — Refinement with images (independent of mobile UI, but needs Phase 2)
4. **Phase 4: Mobile UI** — Note editor integration (depends on Phase 2 routes existing)

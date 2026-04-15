# Note Images - Phase 1 Handoff (2026-04-03)

## Phase: Database + Shared Validators

## Status: COMPLETE

## What was done

### 1. NoteAttachment table added to schema.ts (line 323)
- Columns: id (UUID), storagePath, fileName, mimeType, sizeBytes, order (default 0), noteId (FK), userId (FK), createdAt
- No `aiConsent` column (as specified)
- Indexes on noteId and userId
- FK to notes with onDelete CASCADE
- FK to users with onDelete CASCADE
- Placed after the notes table definition, before interviews

### 2. noteAttachmentsRelations added (line 348)
- `note: one(notes, ...)` referencing noteId -> notes.id
- `user: one(users, ...)` referencing userId -> users.id

### 3. notesRelations updated (line 1216)
- Changed destructured arg from `({ one })` to `({ one, many })`
- Added `attachments: many(noteAttachments)`

### 4. Validators added to shared/validators/index.ts (line 408)
- `noteAttachmentMetadataSchema` - mirrors `attachmentMetadataSchema` but with `order: max(9)` for up to 10 images
- `addNoteAttachmentsSchema` - `{ noteId, attachments: array.min(1).max(10) }`
- `removeNoteAttachmentSchema` - `{ attachmentId }`
- Exported types: `NoteAttachmentMetadata`, `AddNoteAttachmentsInput`, `RemoveNoteAttachmentInput`
- Placed in the "Note validators" section, before `NOTE_EXTRACT_MIN_CHARS`

### 5. Migration generated
- File: `packages/server/drizzle/0017_slippery_satana.sql`
- Creates NoteAttachment table, FKs, and indexes
- Note: migration also picks up a minor Sandbox `updatedAt` default change (pre-existing drift, harmless)

## Deviations
- None. All items matched the spec exactly.

## Files modified
- `packages/server/src/db/schema.ts` - NoteAttachment table, relations, notesRelations update
- `packages/shared/src/validators/index.ts` - 3 new schemas + 3 exported types

## Files generated
- `packages/server/drizzle/0017_slippery_satana.sql` - migration

## Ready for Phase 2
Phase 2 can now build tRPC routes (`addNoteAttachments`, `removeNoteAttachment`, `getNoteAttachments`) and the Supabase Storage upload service using the table and validators defined here.

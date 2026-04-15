# Feature Spec: Note Image Attachments
**Created:** 2026-04-03
**Status:** Draft
**Project type:** Existing codebase

## Problem Statement
Notes currently support only text content. Users want to attach images (screenshots, whiteboard photos, sketches) to notes for richer brain dumps. The AI refinement pipeline should also see these images for better analysis.

## Users and Roles
- Authenticated mobile app users (all tiers)
- No new roles or permissions — same ownership model as notes

## Scope
### In scope (this build)
- Add image attachment capability to notes (camera + photo library)
- Attachment strip UI in note editor header pill area
- Store images in Supabase Storage (reuse existing bucket + presigned URL infrastructure)
- New `NoteAttachment` database table with note FK
- Up to 10 images per note
- Delete individual attachments
- Vision analysis: pass images to AI refinement pipeline
- Carry over images to project attachments when note is promoted

### Out of scope (future / not planned)
- Inline images in the markdown editor (images live in attachment strip only)
- Image editing/cropping
- Video attachments
- Web app support (mobile only for now)
- Image search/tagging independent of note refinement

### MVP vs stretch
- **MVP:** Pick/capture images, upload, display strip, delete, persist in DB. Vision in refinement. Carry-over on promote.
- **Stretch:** Image reordering via drag

## Functional Requirements
### Happy Path
1. User opens an existing note (or creates a new one from a sandbox)
2. User taps the image button in the header pill (next to pin and trash icons)
3. A popover appears with two options: Camera and Photos (reuse `AttachmentPopover` component)
4. User picks images from library (multi-select, up to remaining capacity) or takes a photo
5. Thumbnails appear in an attachment strip below the header (above the editor)
6. Images upload to Supabase Storage via presigned URLs in the background
7. `NoteAttachment` rows are created via a new tRPC mutation after upload completes
8. When note is refined by AI, the images are included as vision content in the Anthropic API call
9. When note is promoted to a project, all note attachments are copied to `ProjectAttachment` rows
10. User can tap the X on a thumbnail to delete it (removes from storage + DB)

### Edge Cases and Error Handling
- **Upload failure:** Show error toast for the specific image, keep other successful uploads. User can retry by re-attaching.
- **Max images reached (10):** Disable the image button in the header pill. Selection limit capped at remaining slots.
- **Image picker not available (dev build):** Show toast "Image picker not available — rebuild required" (existing pattern from capture.tsx)
- **Camera permission denied:** Show toast "Camera permission required"
- **Photo library permission denied:** Show toast "Photo library permission required"
- **Note deleted while upload in progress:** Orphaned storage files are acceptable (can be cleaned up later via cron). The delete mutation should cascade-delete `NoteAttachment` rows.
- **Promote with 10+ images exceeding project limit of 5:** Copy only the first 5 images to project attachments (project limit is 5).
- **HEIC images:** Convert to JPEG client-side before upload (existing pattern)

### Data Validation Rules
- File types: image/jpeg, image/png, image/heic (same as project attachments)
- Max file size: 5MB per image (same as project attachments)
- Max attachments per note: 10
- Order: integer 0-9

## Data Model (high level)
New table `NoteAttachment`:
- Same shape as `ProjectAttachment` but with `noteId` FK instead of `projectId`
- Columns: id, storagePath, fileName, mimeType, sizeBytes, order, noteId, userId, createdAt
- No `aiConsent` column (notes don't have a separate consent flow — the user's account-level consent applies)
- Cascade delete when note is deleted

The `note.get` query must include attachments in its return.

## Non-Functional Requirements
- Image upload should not block note editing (background upload)
- Thumbnail strip should render from local URIs immediately (before upload completes)

## Constraints
- Must reuse existing Supabase Storage bucket (`project-attachments`) and presigned URL infrastructure
- Must follow existing patterns in capture.tsx for image picking and AttachmentPopover for UI
- Must use existing ThumbnailStrip component (adapt max from 5 to 10)
- Vision analysis uses Claude Haiku (existing model in note-ai.ts)

## Open Questions
None — requirements are clear.

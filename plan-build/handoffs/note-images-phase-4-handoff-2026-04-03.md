# Phase 4 Handoff: Mobile Note Editor UI for Image Attachments

**Date:** 2026-04-03
**Status:** Complete

## What was built

Added full image attachment support to the note editor screen, matching the existing capture screen patterns.

## Files modified

### 1. `packages/mobile/src/app/(tabs)/notes/[id]/index.tsx`
- **ImagePlus icon in header pill**: Added between pin and trash buttons, with a pill divider on each side
- **AttachmentPopover integration**: Opens on ImagePlus tap; uses `afterPopoverDismiss` pattern (400ms delay) to avoid iOS crash when UIImagePickerController presents while Modal animates out
- **Image picker handlers**: Lazy-loaded `expo-image-picker` at module level with try/catch. `handleCamera` and `handlePhotos` follow the exact capture.tsx pattern (permission request, quality 0.8, multi-select with selectionLimit)
- **Local attachment state**: `localAttachments` tracks newly picked images for instant thumbnail display. Combined with `savedAttachments` (from `note.attachments`) into `combinedAttachments` for the ThumbnailStrip
- **Upload flow**: After picking, images are added to `localAttachments` immediately, then uploaded sequentially via `attachment.getUploadUrl` + fetch PUT. Once all uploads complete, calls `note.addAttachments` mutation, clears local state, and invalidates the `note.get` cache
- **ThumbnailStrip**: Rendered below the header, above the IdeaCard/editor. Uses `maxAttachments={10}` prop. Saved attachments use `publicUrl` from the server response
- **Remove handler**: Determines whether the tapped thumbnail is saved (has `id`, calls `note.removeAttachment`) or local (pending upload, removes from local state)
- **Disabled state**: ImagePlus button gets opacity 0.4 and disabled when total attachments >= 10
- **Toast errors**: Uses `useToast` from `ToastContext` for upload failure messaging
- **isUploading state**: Shows a small ActivityIndicator next to the thumbnail strip during uploads

### 2. `packages/mobile/src/components/ThumbnailStrip.tsx`
- Changed hardcoded `MAX_ATTACHMENTS = 5` to `DEFAULT_MAX_ATTACHMENTS = 5`
- Added `maxAttachments?: number` to `ThumbnailStripProps` interface
- Component now accepts the prop with default 5, uses it in the counter display
- Backward compatible: capture.tsx still uses the default (5)

### 3. `packages/server/src/routers/note.ts`
- Updated `note.get` procedure to map each attachment and append a `publicUrl` field
- URL constructed as `${SUPABASE_URL}/storage/v1/object/public/project-attachments/${storagePath}`
- Returns `null` for `publicUrl` if `SUPABASE_URL` is not set (graceful degradation)
- Uses the existing `ATTACHMENT_BUCKET` constant from `../lib/supabase`

## Type check
- Server: No new errors from these changes (pre-existing blog content TS4058 errors unrelated)
- Mobile: Not checked via tsc (RN project uses Metro bundler), but code follows exact patterns from capture.tsx

## Patterns followed
- Lazy-loaded `expo-image-picker` with try/catch (same as capture.tsx line 21-26)
- `afterPopoverDismiss` with 400ms setTimeout (same as capture.tsx line 200-205)
- Upload loop: `getUploadUrl` -> fetch blob -> PUT to signed URL -> collect metadata (same as capture.tsx lines 339-389)
- Toast errors via `useToast` (same as capture.tsx)
- `trpc.useUtils()` for cache invalidation

## What's next (Phase 5 candidates)
- AI consent toggle for note images (opt-in to let AI analyze images during refinement)
- Image viewer/lightbox when tapping a thumbnail
- Drag-to-reorder attachments
- Progress bar during multi-image uploads

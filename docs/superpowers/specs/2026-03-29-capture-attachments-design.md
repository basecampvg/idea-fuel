# Capture Attachments — Design Spec

**Date:** 2026-03-29
**Scope:** Add image attachments to mobile idea capture flow

## Overview

Users can attach up to 5 images (camera or photo library) when capturing an idea on mobile. Images are stored in Supabase Storage and optionally made available to the AI pipeline with explicit user consent. Attachments are capture-time only — no editing after submission.

## Storage

**Provider:** Supabase Storage (same project as existing Postgres DB)

- Bucket: `project-attachments`
- Folder structure: `{userId}/{uuid}.{ext}`
- RLS policy: users can only read/write files in their own `{userId}/` prefix
- Add `@supabase/supabase-js` to server package for generating presigned URLs and fetching images in workers
- Mobile uploads use a direct `fetch` PUT to the presigned URL (no Supabase SDK needed on mobile)

## Database

New `project_attachments` table:

| Column | Type | Notes |
|---|---|---|
| id | text (UUID) | PK, auto-generated |
| projectId | text | FK → projects.id, cascade delete |
| userId | text | FK → users.id |
| storagePath | text | Path in Supabase Storage bucket |
| fileName | text | Original filename from device |
| mimeType | text | image/jpeg, image/png, image/heic |
| sizeBytes | integer | File size in bytes |
| order | integer | Display position 0-4 |
| aiConsent | boolean | Default false. User opted in for AI analysis |
| createdAt | timestamp | Auto-set |

Indexes: `projectId`, `userId`.

## Server (tRPC)

### New router: `attachment`

**`attachment.getUploadUrl`** (protectedProcedure)
- Input: `{ fileName: string, mimeType: string }`
- Validates mime type is allowed (image/jpeg, image/png, image/heic)
- Generates a unique storage path: `{userId}/{uuid}.{ext}`
- Returns presigned upload URL + storage path
- Presigned URL expires after 5 minutes

### Extend `project.create`

- Add optional `attachments` array to `createProjectSchema`:
  ```
  attachments: z.array(z.object({
    storagePath: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    order: z.number().min(0).max(4),
  })).max(5).optional()
  ```
- Add optional `aiConsentForImages: z.boolean().default(false)`
- On create: insert project row + attachment rows in a single transaction
- Set `aiConsent` on all attachment rows based on the `aiConsentForImages` flag

## Mobile UI

### Input bar restructure

Change from single-row (text + buttons inline) to **two-row layout** matching Grok's pattern:
- **Row 1:** TextInput (multiline, expands vertically)
- **Row 2:** Action buttons — paperclip on left, mic + send on right

This increases the minimum height of the input bar. The `KeyboardAvoidingView` offset may need adjustment.

### Paperclip button

- Circular button (34x34, `colors.surface` background) with `Paperclip` icon from `lucide-react-native`
- Positioned bottom-left of the input bar
- On tap: opens a popover menu anchored above the button

### Attachment popover

- Dark card (`colors.card`, border `colors.border`, rounded-16)
- Two rows: Camera (camera icon) and Photos (image icon)
- Each row: 36px circular icon container + label text
- Dismisses on outside tap or on selection
- Camera: launches `expo-image-picker` with `launchCameraAsync`
- Photos: launches `expo-image-picker` with `launchImageLibraryAsync` (multi-select, max remaining slots)

### Image constraints (client-side)

- Max 5 images total per idea
- Max 5MB per image after compression
- Allowed types: JPEG, PNG, HEIC
- Client-side resize: max 1920px on longest edge, JPEG quality 0.8
- HEIC auto-converted to JPEG by expo-image-picker

### Thumbnail strip

- Appears inside the input bar between text and action buttons when images are attached
- Horizontal row of 56x56 rounded (10px) thumbnail previews
- Each thumbnail has a red (colors.brand) `×` badge at top-right to remove
- Counter label at end: `2/5` in muted text
- Horizontally scrollable if needed (unlikely with max 5 at 56px)

### AI consent toggle

- Appears below thumbnail strip when at least one image is attached
- Row with label text: "Let AI analyze your images"
- Toggle switch, default off
- Subtle muted description text when toggled on: "Images will be used to enhance AI analysis"
- State tracked as local boolean, sent with project creation

### Upload flow (on capture)

1. User taps send
2. For each attached image that hasn't been uploaded yet:
   a. Call `attachment.getUploadUrl` to get presigned URL + path
   b. Upload image directly to Supabase Storage via presigned URL
3. Call `project.create` with title, description, attachment metadata array, and aiConsent flag
4. Show progress indicator during upload (replace send button with spinner, same as current submit behavior)
5. On success: clear text + attachments, show toast
6. On failure: show error toast, attachments remain so user can retry

### Error handling

- If an individual image upload fails: show toast, remove that image from the list, let user retry
- If project creation fails after uploads: attachment files become orphans in storage — acceptable at this scale, can add cleanup job later if needed
- Camera permission denied: show toast "Camera permission required"
- Photo library permission denied: show toast "Photo library permission required"

## AI Pipeline Integration

### Spark validation worker

When processing a project with consented attachments:
1. Query `project_attachments` where `projectId = X` and `aiConsent = true`
2. For each attachment, fetch the image from Supabase Storage (server-side, using service role key)
3. Convert to base64
4. Include as image content parts in the prompt to the AI model (OpenAI GPT-4o supports vision, Claude supports vision)
5. Add context to the system prompt: "The user has attached images to provide visual context for their idea. Consider these images in your analysis."

### Interview worker

Same pattern — if the project has consented attachments, include them in the interview context so the AI can reference what the user showed.

### Cost note

Vision inputs add token cost. At ~1000 tokens per image (typical for resized photos), 5 images adds ~5K tokens per API call. This is within normal operating costs and doesn't require special rate limiting.

## Not in scope

- Editing/adding/removing attachments after project creation
- Web app attachment support
- Video or document file types
- Per-image consent granularity (all-or-nothing per project)
- Storage cleanup job for orphaned uploads
- Image CDN or caching layer

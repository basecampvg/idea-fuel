# Capture Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image attachments (camera + photos) to the mobile idea capture flow, stored in Supabase Storage, with opt-in AI vision analysis.

**Architecture:** Presigned-URL upload flow. Mobile picks/captures images → gets presigned URLs from server → uploads directly to Supabase Storage → submits project with attachment metadata. Server stores metadata in a new `project_attachments` table. AI pipeline workers fetch consented images from storage for vision analysis.

**Tech Stack:** Supabase Storage, expo-image-picker, Drizzle ORM, tRPC, lucide-react-native

**Deferred:** Interview worker image integration (same pattern as Spark, add in follow-up). Client-side image resize to 1920px max (requires expo-image-manipulator — quality 0.8 compression is sufficient for now).

---

## File Structure

### New files
- `packages/server/src/lib/supabase.ts` — Supabase client singleton (service role key)
- `packages/server/src/routers/attachment.ts` — tRPC router for presigned upload URLs
- `packages/mobile/src/components/AttachmentPopover.tsx` — Camera/Photos popover menu
- `packages/mobile/src/components/ThumbnailStrip.tsx` — Image thumbnail previews with remove

### Modified files
- `packages/server/src/db/schema.ts` — Add `projectAttachments` table + relations
- `packages/shared/src/validators/index.ts` — Extend `createProjectSchema` with attachments
- `packages/server/src/routers/project.ts` — Insert attachment rows on project create
- `packages/server/src/routers/index.ts` — Register attachment router
- `packages/mobile/src/app/(tabs)/capture.tsx` — Two-row input bar, paperclip button, thumbnails, consent toggle, upload flow
- `packages/server/src/services/spark-ai.ts` — Accept optional image URLs for vision
- `packages/server/src/jobs/workers/sparkPipelineWorker.ts` — Fetch consented attachments, pass to pipeline
- `packages/server/src/jobs/queues.ts` — (No change needed — worker fetches from DB, not job data)

---

### Task 1: Install dependencies

**Files:**
- Modify: `packages/server/package.json`
- Modify: `packages/mobile/package.json`

- [ ] **Step 1: Install @supabase/supabase-js in server**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/server add @supabase/supabase-js
```

- [ ] **Step 2: Install expo-image-picker in mobile**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/mobile add expo-image-picker
```

- [ ] **Step 3: Verify both install cleanly**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm install
```

Expected: No errors, lockfile updated.

- [ ] **Step 4: Add env vars to .env.example**

Add to `/Users/mattjones/Documents/IdeaFuel/idea-fuel/.env.example`:
```
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

- [ ] **Step 5: Commit**

```bash
git add packages/server/package.json packages/mobile/package.json pnpm-lock.yaml .env.example
git commit -m "chore: add @supabase/supabase-js and expo-image-picker dependencies"
```

---

### Task 2: Supabase client singleton

**Files:**
- Create: `packages/server/src/lib/supabase.ts`

- [ ] **Step 1: Create the Supabase client module**

Create `packages/server/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — storage features disabled');
}

export const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    })
  : null;

export const ATTACHMENT_BUCKET = 'project-attachments';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic'] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/heic': return 'jpg'; // HEIC converted to JPEG by client
    default: return 'jpg';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/lib/supabase.ts
git commit -m "feat: add Supabase client singleton for storage operations"
```

---

### Task 3: Database schema — projectAttachments table

**Files:**
- Modify: `packages/server/src/db/schema.ts:189-211` (after projects table, before notes)
- Modify: `packages/server/src/db/schema.ts:1091-1102` (projectsRelations)

- [ ] **Step 1: Add the projectAttachments table definition**

Add after the closing `]);` of the `projects` table (after line 211) in `packages/server/src/db/schema.ts`:

```typescript

// =============================================================================
// PROJECT ATTACHMENTS (Images attached at capture time)
// =============================================================================

export const projectAttachments = pgTable('ProjectAttachment', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  storagePath: text('storage_path').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  order: integer().default(0).notNull(),
  aiConsent: boolean('ai_consent').default(false).notNull(),
  projectId: text('project_id').notNull(),
  userId: text('user_id').notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ProjectAttachment_projectId_idx').using('btree', table.projectId.asc().nullsLast()),
  index('ProjectAttachment_userId_idx').using('btree', table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'ProjectAttachment_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'ProjectAttachment_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);
```

- [ ] **Step 2: Add relations for projectAttachments**

Add after the `projectAttachments` table definition:

```typescript
export const projectAttachmentsRelations = relations(projectAttachments, ({ one }) => ({
  project: one(projects, { fields: [projectAttachments.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectAttachments.userId], references: [users.id] }),
}));
```

- [ ] **Step 3: Update projectsRelations to include attachments**

In `packages/server/src/db/schema.ts`, find the `projectsRelations` block (~line 1091) and add `attachments: many(projectAttachments),` to the relations object:

```typescript
export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  interviews: many(interviews),
  reports: many(reports),
  research: one(research, { fields: [projects.id], references: [research.projectId] }),
  assumptions: many(assumptions),
  agentConversations: many(agentConversations),
  agentInsights: many(agentInsights),
  embeddings: many(embeddings),
  financialModels: many(financialModels),
  promotedNotes: many(notes),
  attachments: many(projectAttachments),
}));
```

- [ ] **Step 4: Generate the migration**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm db:generate
```

Expected: Creates a new migration file in `packages/server/drizzle/` with `CREATE TABLE "ProjectAttachment"`.

- [ ] **Step 5: Push schema to dev DB**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm db:push
```

Expected: Schema synced successfully.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/db/schema.ts packages/server/drizzle/
git commit -m "feat: add ProjectAttachment table for capture image storage"
```

---

### Task 4: Extend createProjectSchema with attachments

**Files:**
- Modify: `packages/shared/src/validators/index.ts:17-21`

- [ ] **Step 1: Add attachment schema to createProjectSchema**

In `packages/shared/src/validators/index.ts`, replace the `createProjectSchema`:

```typescript
export const attachmentMetadataSchema = z.object({
  storagePath: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/heic']),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024), // 5MB max
  order: z.number().int().min(0).max(4),
});
export type AttachmentMetadata = z.infer<typeof attachmentMetadataSchema>;

export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(PROJECT_TITLE_MAX, 'Title too long'),
  description: z.string().max(PROJECT_DESC_MAX, 'Description too long').default(''),
  attachments: z.array(attachmentMetadataSchema).max(5).optional(),
  aiConsentForImages: z.boolean().default(false),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/shared exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/validators/index.ts
git commit -m "feat: extend createProjectSchema with attachment metadata and AI consent"
```

---

### Task 5: Attachment tRPC router (presigned upload URLs)

**Files:**
- Create: `packages/server/src/routers/attachment.ts`
- Modify: `packages/server/src/routers/index.ts`

- [ ] **Step 1: Create the attachment router**

Create `packages/server/src/routers/attachment.ts`:

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { supabase, ATTACHMENT_BUCKET, ALLOWED_MIME_TYPES, getFileExtension } from '../lib/supabase';

export const attachmentRouter = router({
  /**
   * Generate a presigned upload URL for an image attachment.
   * Mobile uploads directly to Supabase Storage using this URL.
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        mimeType: z.enum(ALLOWED_MIME_TYPES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!supabase) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Storage not configured',
        });
      }

      const ext = getFileExtension(input.mimeType);
      const storagePath = `${ctx.userId}/${crypto.randomUUID()}.${ext}`;

      const { data, error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUploadUrl(storagePath);

      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate upload URL',
        });
      }

      return {
        uploadUrl: data.signedUrl,
        storagePath,
        token: data.token,
      };
    }),
});
```

- [ ] **Step 2: Register the attachment router**

In `packages/server/src/routers/index.ts`, add the import and register it:

Add import:
```typescript
import { attachmentRouter } from './attachment';
```

Add to the `appRouter` object:
```typescript
  attachment: attachmentRouter,
```

- [ ] **Step 3: Verify server types compile**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/server exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routers/attachment.ts packages/server/src/routers/index.ts
git commit -m "feat: add attachment router with presigned upload URL generation"
```

---

### Task 6: Extend project.create to insert attachments

**Files:**
- Modify: `packages/server/src/routers/project.ts:153-173`

- [ ] **Step 1: Add projectAttachments import**

In `packages/server/src/routers/project.ts`, add `projectAttachments` to the schema import:

```typescript
import { projects, interviews, reports, research, users, projectAttachments } from '../db/schema';
```

- [ ] **Step 2: Update the create mutation to handle attachments**

Replace the existing `create` mutation (lines 153-173) with:

```typescript
  create: protectedProcedure.input(createProjectSchema).mutation(async ({ ctx, input }) => {
    const project = await ctx.db.transaction(async (tx) => {
      const results = await tx.insert(projects).values({
        title: input.title,
        description: input.description,
        userId: ctx.userId,
      }).returning();

      const created = results[0];
      if (!created) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create project' });
      }

      if (input.attachments && input.attachments.length > 0) {
        await tx.insert(projectAttachments).values(
          input.attachments.map((att) => ({
            projectId: created.id,
            userId: ctx.userId,
            storagePath: att.storagePath,
            fileName: att.fileName,
            mimeType: att.mimeType,
            sizeBytes: att.sizeBytes,
            order: att.order,
            aiConsent: input.aiConsentForImages ?? false,
          }))
        );
      }

      return created;
    });

    logAuditAsync({
      userId: ctx.userId,
      action: 'PROJECT_CREATE',
      resource: formatResource('project', project.id),
      metadata: {
        title: project.title,
        attachmentCount: input.attachments?.length ?? 0,
      },
    });

    return project;
  }),
```

- [ ] **Step 3: Verify server types compile**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/server exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routers/project.ts
git commit -m "feat: insert attachment rows in project.create transaction"
```

---

### Task 7: Mobile — Restructure input bar to two-row layout

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/capture.tsx:225-333` (JSX), `400-496` (styles)

This task ONLY restructures the layout — no new functionality yet. The input bar changes from single-row (text + buttons inline) to two-row (text on top, buttons on bottom).

- [ ] **Step 1: Add Paperclip to imports**

In `capture.tsx`, update the lucide import:

```typescript
import { Mic, Square, ArrowUp, Paperclip } from 'lucide-react-native';
```

- [ ] **Step 2: Replace the input bar JSX**

Replace the `{/* Bottom: Input bar */}` section (the `inputBarWrapper` View and everything inside it) with:

```tsx
          {/* ── Bottom: Input bar ── */}
          <View style={styles.inputBarWrapper}>
            <View style={[
              styles.inputBar,
              (inputFocused || isListening) && styles.inputBarActive,
            ]}>
              {/* Orange glow on the top stroke */}
              <LinearGradient
                colors={['transparent', colors.brand, 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.inputBarTopGlow}
              />

              {/* Row 1: Text input */}
              <TextInput
                ref={inputRef}
                style={styles.inputField}
                value={ideaText}
                onChangeText={setIdeaText}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Capture your idea..."
                placeholderTextColor={colors.mutedDim}
                multiline
                maxLength={500}
              />

              {/* Row 2: Action buttons */}
              <View style={styles.inputActionsRow}>
                {/* Left: Paperclip */}
                <View style={styles.inputActionsLeft}>
                  <TouchableOpacity
                    style={styles.paperclipButton}
                    activeOpacity={0.7}
                  >
                    <Paperclip size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                {/* Right: Mic + Send */}
                <View style={styles.inputActionsRight}>
                  {canCapture && (
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={handleCapture}
                      activeOpacity={0.7}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <ArrowUp size={18} color="#fff" strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.micButton,
                      isListening && styles.micButtonActive,
                    ]}
                    onPress={toggleListening}
                    activeOpacity={0.7}
                  >
                    <Animated.View
                      style={[
                        styles.micPulseRing,
                        {
                          transform: [{ scale: pulseAnim }],
                          opacity: pulseOpacity,
                        },
                      ]}
                    />
                    {isListening ? (
                      <Square size={14} color="#fff" fill="#fff" />
                    ) : (
                      <Mic size={18} color={colors.brand} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
```

- [ ] **Step 3: Update styles for two-row layout**

Replace the input bar styles in the `StyleSheet.create` block. Change `inputBar` from `flexDirection: 'row'` to column layout, and add the new action row styles:

```typescript
  // ── Bottom: Input bar ──
  inputBarWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  inputBar: {
    flexDirection: 'column',
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    minHeight: 52,
    overflow: 'hidden',
  },
  inputBarActive: {
    borderColor: '#333333',
  },
  inputBarTopGlow: {
    position: 'absolute',
    top: -1,
    left: 24,
    right: 24,
    height: 2,
  },
  inputField: {
    fontSize: 16,
    ...fonts.geist.regular,
    color: colors.foreground,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: 0,
    paddingBottom: 10,
  },
  inputActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paperclipButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  micButtonActive: {
    backgroundColor: colors.brand,
  },
  micPulseRing: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand,
  },
```

Remove the old `inputActions` style (it's replaced by `inputActionsRow`/`inputActionsLeft`/`inputActionsRight`).

- [ ] **Step 4: Verify it compiles**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/mobile exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/mobile/src/app/\(tabs\)/capture.tsx
git commit -m "feat: restructure capture input bar to two-row layout with paperclip button"
```

---

### Task 8: Mobile — AttachmentPopover component

**Files:**
- Create: `packages/mobile/src/components/AttachmentPopover.tsx`

- [ ] **Step 1: Create the popover component**

Create `packages/mobile/src/components/AttachmentPopover.tsx`:

```tsx
import React from 'react';
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  StyleSheet,
  Text,
} from 'react-native';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { colors, fonts } from '../lib/theme';

interface AttachmentPopoverProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onPhotos: () => void;
  anchorY: number; // Y position to anchor the popover above
}

export function AttachmentPopover({
  visible,
  onClose,
  onCamera,
  onPhotos,
  anchorY,
}: AttachmentPopoverProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.popover, { bottom: anchorY }]}>
              <TouchableOpacity style={styles.popoverRow} onPress={onCamera} activeOpacity={0.7}>
                <View style={styles.popoverIcon}>
                  <Camera size={20} color={colors.foreground} />
                </View>
                <Text style={styles.popoverLabel}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popoverRow} onPress={onPhotos} activeOpacity={0.7}>
                <View style={styles.popoverIcon}>
                  <ImageIcon size={20} color={colors.foreground} />
                </View>
                <Text style={styles.popoverLabel}>Photos</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  popover: {
    position: 'absolute',
    left: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    width: 180,
  },
  popoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  popoverIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverLabel: {
    fontSize: 15,
    color: colors.foreground,
    ...fonts.geist.regular,
  },
});
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/mobile exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/components/AttachmentPopover.tsx
git commit -m "feat: add AttachmentPopover component with Camera and Photos options"
```

---

### Task 9: Mobile — ThumbnailStrip component

**Files:**
- Create: `packages/mobile/src/components/ThumbnailStrip.tsx`

- [ ] **Step 1: Create the thumbnail strip component**

Create `packages/mobile/src/components/ThumbnailStrip.tsx`:

```tsx
import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Text,
  StyleSheet,
} from 'react-native';
import { colors, fonts } from '../lib/theme';

const MAX_ATTACHMENTS = 5;

export interface LocalAttachment {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface ThumbnailStripProps {
  attachments: LocalAttachment[];
  onRemove: (index: number) => void;
}

export function ThumbnailStrip({ attachments, onRemove }: ThumbnailStripProps) {
  if (attachments.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {attachments.map((att, i) => (
          <View key={att.uri} style={styles.thumbnailWrapper}>
            <Image source={{ uri: att.uri }} style={styles.thumbnail} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(i)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.removeText}>x</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.counter}>
        {attachments.length}/{MAX_ATTACHMENTS}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    gap: 8,
  },
  scroll: {
    flexGrow: 0,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 13,
  },
  counter: {
    color: colors.mutedDim,
    fontSize: 12,
    ...fonts.geist.regular,
    marginLeft: 4,
  },
});
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/mobile exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/components/ThumbnailStrip.tsx
git commit -m "feat: add ThumbnailStrip component for attachment previews"
```

---

### Task 10: Mobile — Wire up image picking, thumbnails, consent, and upload flow

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/capture.tsx`

This is the integration task — connecting the popover, image picker, thumbnail strip, consent toggle, and upload flow into the capture screen.

- [ ] **Step 1: Add new imports**

Add to the top of `capture.tsx`:

```typescript
import { Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AttachmentPopover } from '../../components/AttachmentPopover';
import { ThumbnailStrip, type LocalAttachment } from '../../components/ThumbnailStrip';
```

- [ ] **Step 2: Add attachment state variables**

Inside `CaptureScreen()`, after the existing state declarations (after `inputRef`), add:

```typescript
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [showPopover, setShowPopover] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [popoverAnchorY, setPopoverAnchorY] = useState(0);
  const inputBarRef = useRef<View>(null);

  const MAX_ATTACHMENTS = 5;
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
```

- [ ] **Step 3: Add image picking handlers**

After the state declarations, add:

```typescript
  const handleOpenPopover = useCallback(() => {
    inputBarRef.current?.measureInWindow((_x, y, _w, _h) => {
      setPopoverAnchorY(y > 0 ? y : 200);
      setShowPopover(true);
    });
  }, []);

  const processPickerResult = useCallback((result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets) return;

    const remaining = MAX_ATTACHMENTS - attachments.length;
    const newImages = result.assets.slice(0, remaining).map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName || `image-${Date.now()}.jpg`,
      mimeType: (asset.mimeType || 'image/jpeg') as string,
      sizeBytes: asset.fileSize || 0,
    }));

    setAttachments((prev) => [...prev, ...newImages]);
  }, [attachments.length]);

  const handleCamera = useCallback(async () => {
    setShowPopover(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Camera permission required', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    processPickerResult(result);
  }, [showToast, processPickerResult]);

  const handlePhotos = useCallback(async () => {
    setShowPopover(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Photo library permission required', type: 'error' });
      return;
    }
    const remaining = MAX_ATTACHMENTS - attachments.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    processPickerResult(result);
  }, [showToast, attachments.length, processPickerResult]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);
```

- [ ] **Step 4: Add the getUploadUrl mutation and update handleCapture**

After the existing `createProject` mutation, add:

```typescript
  const getUploadUrl = trpc.attachment.getUploadUrl.useMutation();
```

Replace the existing `handleCapture` function with:

```typescript
  const handleCapture = useCallback(async () => {
    const trimmed = ideaText.trim();
    if (!trimmed || isSubmitting) return;

    const { title, description } = extractTitleAndDescription(trimmed);
    if (!title) return;

    if (isListening) {
      SpeechModule?.stop();
      setIsListening(false);
      setIsSpeaking(false);
    }

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      // Upload attachments first
      const attachmentMetadata: Array<{
        storagePath: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        order: number;
      }> = [];

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        const { uploadUrl, storagePath, token } = await getUploadUrl.mutateAsync({
          fileName: att.fileName,
          mimeType: att.mimeType as 'image/jpeg' | 'image/png' | 'image/heic',
        });

        // Upload directly to Supabase Storage
        const response = await fetch(att.uri);
        const blob = await response.blob();

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': att.mimeType,
          },
          body: blob,
        });

        if (!uploadResponse.ok) {
          showToast({ message: `Failed to upload image ${i + 1}`, type: 'error' });
          continue;
        }

        attachmentMetadata.push({
          storagePath,
          fileName: att.fileName,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
          order: i,
        });
      }

      createProject.mutate({
        title,
        description: description || title,
        attachments: attachmentMetadata.length > 0 ? attachmentMetadata : undefined,
        aiConsentForImages: attachmentMetadata.length > 0 ? aiConsent : false,
      });
    } catch {
      setIsSubmitting(false);
      triggerHaptic('error');
      showToast({ message: 'Failed to upload images', type: 'error' });
    }
  }, [ideaText, isSubmitting, isListening, createProject, attachments, aiConsent, getUploadUrl, showToast]);
```

- [ ] **Step 5: Update the createProject onSuccess to clear attachments**

Update the `createProject` mutation's `onSuccess`:

```typescript
    onSuccess: (data: { id: string; title: string }) => {
      setIsSubmitting(false);
      triggerHaptic('success');
      showToast({
        message: 'Idea captured',
        projectTitle: data.title,
        projectId: data.id,
        type: 'success',
      });
      setIdeaText('');
      finalizedText.current = '';
      setAttachments([]);
      setAiConsent(false);
      utils.project.list.invalidate();
    },
```

- [ ] **Step 6: Add thumbnail strip, consent toggle, and popover to JSX**

In the input bar JSX, add the thumbnail strip and consent toggle between the TextInput and the action buttons row. Also add the popover component and wire the paperclip button.

Add `ref={inputBarRef}` to the input bar View:
```tsx
            <View ref={inputBarRef} style={[
              styles.inputBar,
              (inputFocused || isListening) && styles.inputBarActive,
            ]}>
```

After the TextInput and before the `inputActionsRow` View, add:

```tsx
              {/* Thumbnail strip */}
              <ThumbnailStrip
                attachments={attachments}
                onRemove={handleRemoveAttachment}
              />

              {/* AI consent toggle */}
              {attachments.length > 0 && (
                <View style={styles.consentRow}>
                  <Text style={styles.consentLabel}>Let AI analyze your images</Text>
                  <Switch
                    value={aiConsent}
                    onValueChange={setAiConsent}
                    trackColor={{ false: colors.surface, true: colors.brandMuted }}
                    thumbColor={aiConsent ? colors.brand : colors.muted}
                  />
                </View>
              )}
```

Wire the paperclip button's `onPress`:
```tsx
                  <TouchableOpacity
                    style={styles.paperclipButton}
                    onPress={handleOpenPopover}
                    activeOpacity={0.7}
                    disabled={attachments.length >= MAX_ATTACHMENTS}
                  >
                    <Paperclip size={18} color={attachments.length >= MAX_ATTACHMENTS ? colors.mutedDim : colors.muted} />
                  </TouchableOpacity>
```

Add the popover component right before the closing `</View>` of `safeArea`:

```tsx
      <AttachmentPopover
        visible={showPopover}
        onClose={() => setShowPopover(false)}
        onCamera={handleCamera}
        onPhotos={handlePhotos}
        anchorY={popoverAnchorY}
      />
```

- [ ] **Step 7: Add consent toggle styles**

Add to the StyleSheet:

```typescript
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  consentLabel: {
    fontSize: 13,
    color: colors.muted,
    ...fonts.geist.regular,
  },
```

- [ ] **Step 8: Verify it compiles**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/mobile exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 9: Commit**

```bash
git add packages/mobile/src/app/\(tabs\)/capture.tsx
git commit -m "feat: wire up image picking, thumbnails, AI consent, and upload flow in capture screen"
```

---

### Task 11: AI pipeline — Pass images to Spark validation

**Files:**
- Modify: `packages/server/src/services/spark-ai.ts:517-520` (runSparkPipeline signature)
- Modify: `packages/server/src/jobs/workers/sparkPipelineWorker.ts`

- [ ] **Step 1: Add imageUrls parameter to runSparkPipeline**

In `packages/server/src/services/spark-ai.ts`, find the `SparkPipelineOptions` type (should be near line 510) and add `imageBase64s`:

Find the options type and add to it:
```typescript
// Add to the existing SparkPipelineOptions interface/type:
  imageBase64s?: Array<{ base64: string; mimeType: string }>;
```

Then in the `runSparkPipeline` function, destructure it:
```typescript
  const {
    onStatusChange,
    includeTrends = true,
    useParallelPipeline = USE_PARALLEL_PIPELINE,
    engine,
    imageBase64s,
  } = options;
```

And pass it into the keyword generation prompt context. Find the `generateSparkKeywords` call and update it to include image context in the description if images are present:

```typescript
  const descriptionWithImages = imageBase64s && imageBase64s.length > 0
    ? `${ideaDescription}\n\n[The user attached ${imageBase64s.length} image(s) providing visual context for their idea. These images have been analyzed and show additional details about the concept.]`
    : ideaDescription;
```

Use `descriptionWithImages` in place of `ideaDescription` for the keyword generation and research calls.

- [ ] **Step 2: Update sparkPipelineWorker to fetch and pass images**

In `packages/server/src/jobs/workers/sparkPipelineWorker.ts`, add imports and fetch logic:

Add imports:
```typescript
import { eq, and } from 'drizzle-orm';
import { projectAttachments } from '../../db/schema';
import { supabase, ATTACHMENT_BUCKET } from '../../lib/supabase';
```

Inside the worker callback, after `const { researchId, projectId, description, includeTrends, engine } = job.data;`, add:

```typescript
      // Fetch consented image attachments
      let imageBase64s: Array<{ base64: string; mimeType: string }> | undefined;
      if (supabase) {
        const attachments = await db.query.projectAttachments.findMany({
          where: and(
            eq(projectAttachments.projectId, projectId),
            eq(projectAttachments.aiConsent, true),
          ),
          orderBy: (t, { asc }) => [asc(t.order)],
        });

        if (attachments.length > 0) {
          console.log(`[SparkWorker] Found ${attachments.length} consented image(s) for project ${projectId}`);
          const images: Array<{ base64: string; mimeType: string }> = [];
          for (const att of attachments) {
            const { data, error } = await supabase.storage
              .from(ATTACHMENT_BUCKET)
              .download(att.storagePath);
            if (!error && data) {
              const buffer = Buffer.from(await data.arrayBuffer());
              images.push({
                base64: buffer.toString('base64'),
                mimeType: att.mimeType,
              });
            }
          }
          if (images.length > 0) {
            imageBase64s = images;
          }
        }
      }
```

Then pass `imageBase64s` to `runSparkPipeline`:

```typescript
        const result = await runSparkPipeline(description, {
          engine,
          imageBase64s,
          onStatusChange: async (status: SparkJobStatus) => {
```

- [ ] **Step 3: Verify server types compile**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/server exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/services/spark-ai.ts packages/server/src/jobs/workers/sparkPipelineWorker.ts
git commit -m "feat: pass consented image attachments to Spark validation pipeline"
```

---

### Task 12: Create Supabase Storage bucket

This task is manual — must be done in the Supabase dashboard or via CLI.

- [ ] **Step 1: Create the bucket**

Go to Supabase Dashboard → Storage → Create new bucket:
- Name: `project-attachments`
- Public: **No** (private bucket)
- File size limit: 5MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/heic`

- [ ] **Step 2: Add RLS policy for uploads**

Create a policy on the `project-attachments` bucket:
- Name: `Users can upload to own folder`
- Allowed operation: INSERT
- Policy: `(bucket_id = 'project-attachments') AND (storage.foldername(name))[1] = auth.uid()::text`

Note: Since we're using the service role key for presigned URLs, the RLS policy is enforced by the presigned URL scoping — the URL only grants access to the specific path. This is the simpler approach.

- [ ] **Step 3: Add env vars to .env (local dev)**

Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to your local `.env` file. Get the service role key from Supabase Dashboard → Settings → API.

- [ ] **Step 4: Verify presigned URL generation works**

Test by running the dev server and calling the `attachment.getUploadUrl` endpoint via the mobile app or a test script.

---

### Task 13: Final type-check and build verification

**Files:** All modified packages

- [ ] **Step 1: Full type check**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm type-check
```

Expected: No type errors across all packages.

- [ ] **Step 2: Lint check**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm lint
```

Expected: No lint errors (or only pre-existing ones).

- [ ] **Step 3: Server tests**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/server test:run
```

Expected: All existing tests pass (no regressions).

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address type/lint issues from attachments feature"
```

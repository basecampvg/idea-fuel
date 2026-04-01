# Meta Ads Content Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal tool for generating, inline-editing, and bulk-exporting typographic Meta ad creatives via AI chat.

**Architecture:** Split-pane workspace — AI chat (left) generates structured ad concepts via Claude tool calling, ad canvas (right) renders each concept across 5 Meta ad sizes as HTML/CSS cards. Cards are editable inline (contentEditable with accent markup), rendered at full resolution off-screen, and exported via html-to-image + jszip.

**Tech Stack:** React 19, Next.js 15, Tailwind CSS 4, Vercel AI SDK v6 (useChat + streamText), tRPC, Drizzle ORM, html-to-image, jszip, file-saver

**Spec:** `docs/superpowers/specs/2026-03-31-meta-ads-content-engine-design.md`

---

## File Structure

### New Files

```
packages/shared/src/types/meta-ads.ts          — Campaign & AdConcept types
packages/shared/src/validators/meta-ads.ts      — Zod schemas for campaign CRUD + chat

packages/server/src/db/schema.ts                — (modify) Add campaigns, adConcepts tables + enums
packages/server/src/routers/campaign.ts          — tRPC router for campaign CRUD + concept mutations
packages/server/src/routers/index.ts             — (modify) Register campaign router
packages/server/src/services/meta-ads-ai.ts      — System prompt + tool definitions for ad copy generation

packages/web/src/app/(dashboard)/campaigns/page.tsx              — Campaign list page
packages/web/src/app/(dashboard)/campaigns/[id]/page.tsx         — Campaign workspace (split pane)
packages/web/src/app/api/campaigns/chat/route.ts                 — Streaming chat endpoint

packages/web/src/components/meta-ads/campaign-chat.tsx           — Left panel: AI chat UI
packages/web/src/components/meta-ads/ad-canvas.tsx               — Right panel: orchestrator
packages/web/src/components/meta-ads/canvas-toolbar.tsx           — View toggle, size filter, export controls
packages/web/src/components/meta-ads/concept-group.tsx            — One concept with all 5 size cards
packages/web/src/components/meta-ads/ad-card.tsx                  — Single ad card (preview + export node)
packages/web/src/components/meta-ads/editable-text.tsx            — contentEditable with accent markup
packages/web/src/components/meta-ads/logo-mark.tsx                — IdeaFuel logo component for cards
packages/web/src/components/meta-ads/export-utils.ts              — html-to-image + jszip export logic
packages/web/src/components/meta-ads/campaign-context.tsx         — React context for campaign state
packages/web/src/components/meta-ads/accent-utils.ts              — Parse/serialize {{accent}} markup
```

---

## Task 1: Shared Types & Validators

**Files:**
- Create: `packages/shared/src/types/meta-ads.ts`
- Create: `packages/shared/src/validators/meta-ads.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/validators/index.ts`

- [ ] **Step 1: Create meta-ads types**

```typescript
// packages/shared/src/types/meta-ads.ts

export type LogoPosition = 'top' | 'bottom';
export type AdLayout = 'headline-subline' | 'centered-body';

export interface AdConcept {
  id: string;
  campaignId: string;
  headline: string;
  body: string;
  logoPosition: LogoPosition;
  layout: AdLayout;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description: string;
  chatMessages: CampaignChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface CampaignWithConcepts extends Campaign {
  concepts: AdConcept[];
}

export const AD_SIZES = {
  feed: { width: 1080, height: 1080, label: 'Feed (1:1)' },
  portrait: { width: 1080, height: 1350, label: 'Portrait (4:5)' },
  story: { width: 1080, height: 1920, label: 'Story (9:16)' },
  carousel: { width: 1080, height: 1080, label: 'Carousel (1:1)' },
  landscape: { width: 1200, height: 628, label: 'Landscape (1.91:1)' },
} as const;

export type AdSizeKey = keyof typeof AD_SIZES;
```

- [ ] **Step 2: Create meta-ads validators**

```typescript
// packages/shared/src/validators/meta-ads.ts

import { z } from 'zod';

export const logoPositionSchema = z.enum(['top', 'bottom']);
export const adLayoutSchema = z.enum(['headline-subline', 'centered-body']);

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(2000).default(''),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
});
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const addConceptsSchema = z.object({
  campaignId: z.string().min(1),
  concepts: z.array(z.object({
    headline: z.string().min(1).max(500),
    body: z.string().max(1000).default(''),
    logoPosition: logoPositionSchema.default('bottom'),
    layout: adLayoutSchema.default('headline-subline'),
  })).min(1).max(20),
});
export type AddConceptsInput = z.infer<typeof addConceptsSchema>;

export const updateConceptSchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1).max(500).optional(),
  body: z.string().max(1000).optional(),
  logoPosition: logoPositionSchema.optional(),
  layout: adLayoutSchema.optional(),
  order: z.number().int().min(0).optional(),
});
export type UpdateConceptInput = z.infer<typeof updateConceptSchema>;

export const reorderConceptsSchema = z.object({
  campaignId: z.string().min(1),
  conceptIds: z.array(z.string().min(1)).min(1),
});
export type ReorderConceptsInput = z.infer<typeof reorderConceptsSchema>;

export const campaignChatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    parts: z.array(z.record(z.unknown())).max(50),
    metadata: z.unknown().optional(),
  })).min(1).max(100),
  campaignId: z.string().min(1),
});
export type CampaignChatRequest = z.infer<typeof campaignChatRequestSchema>;
```

- [ ] **Step 3: Re-export from shared barrel files**

Add to `packages/shared/src/types/index.ts`:
```typescript
export * from './meta-ads';
```

Add to `packages/shared/src/validators/index.ts`:
```typescript
export * from './meta-ads';
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm --filter @forge/shared type-check`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/meta-ads.ts packages/shared/src/validators/meta-ads.ts packages/shared/src/types/index.ts packages/shared/src/validators/index.ts
git commit -m "feat(shared): add meta ads campaign types and validators"
```

---

## Task 2: Database Schema

**Files:**
- Modify: `packages/server/src/db/schema.ts`

- [ ] **Step 1: Add enums and tables to schema.ts**

Add after the existing enum definitions (around line 78):

```typescript
export const logoPositionEnum = pgEnum('LogoPosition', ['top', 'bottom']);
export const adLayoutEnum = pgEnum('AdLayout', ['headline-subline', 'centered-body']);
```

Add after the existing table definitions (end of file):

```typescript
export const campaigns = pgTable('Campaign', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text().notNull(),
  name: text().notNull(),
  description: text().default('').notNull(),
  chatMessages: jsonb('chat_messages').notNull().$type<{ id: string; role: 'user' | 'assistant'; content: string }[]>().default([]),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('Campaign_userId_idx').using('btree', table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'Campaign_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

export const adConcepts = pgTable('AdConcept', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  campaignId: text().notNull(),
  headline: text().notNull(),
  body: text().default('').notNull(),
  logoPosition: logoPositionEnum().default('bottom').notNull(),
  layout: adLayoutEnum().default('headline-subline').notNull(),
  order: integer().default(0).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('AdConcept_campaignId_idx').using('btree', table.campaignId.asc().nullsLast()),
  foreignKey({
    columns: [table.campaignId],
    foreignColumns: [campaigns.id],
    name: 'AdConcept_campaignId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);
```

- [ ] **Step 2: Generate migration**

Run: `pnpm db:generate`
Expected: A new migration file in `packages/server/drizzle/` with CREATE TYPE and CREATE TABLE statements

- [ ] **Step 3: Push schema to dev DB**

Run: `pnpm db:push`
Expected: Schema changes applied successfully

- [ ] **Step 4: Verify types compile**

Run: `pnpm --filter @forge/server type-check`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/db/schema.ts packages/server/drizzle/
git commit -m "feat(db): add campaigns and ad_concepts tables with enums"
```

---

## Task 3: tRPC Campaign Router

**Files:**
- Create: `packages/server/src/routers/campaign.ts`
- Modify: `packages/server/src/routers/index.ts`

- [ ] **Step 1: Create campaign router**

```typescript
// packages/server/src/routers/campaign.ts

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, asc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { campaigns, adConcepts } from '../db/schema';
import {
  createCampaignSchema,
  updateCampaignSchema,
  addConceptsSchema,
  updateConceptSchema,
  reorderConceptsSchema,
} from '@forge/shared';

export const campaignRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, ctx.userId))
      .orderBy(asc(campaigns.createdAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, input.id), eq(campaigns.userId, ctx.userId)),
      });
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      const concepts = await ctx.db
        .select()
        .from(adConcepts)
        .where(eq(adConcepts.campaignId, input.id))
        .orderBy(asc(adConcepts.order));
      return { ...campaign, concepts };
    }),

  create: protectedProcedure
    .input(createCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await ctx.db
        .insert(campaigns)
        .values({
          userId: ctx.userId,
          name: input.name,
          description: input.description,
        })
        .returning();
      if (!campaign) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create campaign' });
      }
      return campaign;
    }),

  update: protectedProcedure
    .input(updateCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [campaign] = await ctx.db
        .update(campaigns)
        .set(data)
        .where(and(eq(campaigns.id, id), eq(campaigns.userId, ctx.userId)))
        .returning();
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      return campaign;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(campaigns)
        .where(and(eq(campaigns.id, input.id), eq(campaigns.userId, ctx.userId)))
        .returning();
      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      return deleted;
    }),

  updateChatMessages: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      chatMessages: z.array(z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await ctx.db
        .update(campaigns)
        .set({ chatMessages: input.chatMessages })
        .where(and(eq(campaigns.id, input.id), eq(campaigns.userId, ctx.userId)))
        .returning();
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      return campaign;
    }),

  addConcepts: protectedProcedure
    .input(addConceptsSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify campaign ownership
      const campaign = await ctx.db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, input.campaignId), eq(campaigns.userId, ctx.userId)),
      });
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      // Get current max order
      const existing = await ctx.db
        .select({ order: adConcepts.order })
        .from(adConcepts)
        .where(eq(adConcepts.campaignId, input.campaignId))
        .orderBy(asc(adConcepts.order));
      const maxOrder = existing.length > 0 ? existing[existing.length - 1]!.order : -1;

      const values = input.concepts.map((c, i) => ({
        campaignId: input.campaignId,
        headline: c.headline,
        body: c.body,
        logoPosition: c.logoPosition,
        layout: c.layout,
        order: maxOrder + 1 + i,
      }));
      const inserted = await ctx.db.insert(adConcepts).values(values).returning();
      return inserted;
    }),

  updateConcept: protectedProcedure
    .input(updateConceptSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // Verify ownership through campaign
      const concept = await ctx.db.query.adConcepts.findFirst({
        where: eq(adConcepts.id, id),
      });
      if (!concept) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Concept not found' });
      }
      const campaign = await ctx.db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, concept.campaignId), eq(campaigns.userId, ctx.userId)),
      });
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      const [updated] = await ctx.db
        .update(adConcepts)
        .set(data)
        .where(eq(adConcepts.id, id))
        .returning();
      return updated;
    }),

  removeConcept: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const concept = await ctx.db.query.adConcepts.findFirst({
        where: eq(adConcepts.id, input.id),
      });
      if (!concept) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Concept not found' });
      }
      const campaign = await ctx.db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, concept.campaignId), eq(campaigns.userId, ctx.userId)),
      });
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      await ctx.db.delete(adConcepts).where(eq(adConcepts.id, input.id));
      return { id: input.id };
    }),

  reorderConcepts: protectedProcedure
    .input(reorderConceptsSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify campaign ownership
      const campaign = await ctx.db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, input.campaignId), eq(campaigns.userId, ctx.userId)),
      });
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      // Update order for each concept
      await Promise.all(
        input.conceptIds.map((id, index) =>
          ctx.db.update(adConcepts).set({ order: index }).where(eq(adConcepts.id, id))
        )
      );
      return { success: true };
    }),
});
```

- [ ] **Step 2: Register router in index.ts**

Add import to `packages/server/src/routers/index.ts`:

```typescript
import { campaignRouter } from './campaign';
```

Add to the `appRouter` object:

```typescript
campaign: campaignRouter,
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm --filter @forge/server type-check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routers/campaign.ts packages/server/src/routers/index.ts
git commit -m "feat(server): add campaign tRPC router with CRUD and concept mutations"
```

---

## Task 4: AI Service & Chat Endpoint

**Files:**
- Create: `packages/server/src/services/meta-ads-ai.ts`
- Create: `packages/web/src/app/api/campaigns/chat/route.ts`

- [ ] **Step 1: Create meta-ads AI service**

```typescript
// packages/server/src/services/meta-ads-ai.ts

import { z } from 'zod';
import type { AdConcept } from '@forge/shared';

export const generateAdConceptsTool = {
  description: 'Generate ad copy concepts for a Meta ads campaign. Each concept is a typographic ad with bold headlines and selective accent coloring on key words/phrases.',
  parameters: z.object({
    concepts: z.array(z.object({
      headline: z.string().describe('Bold display text in ALL CAPS. This is the main attention-grabbing copy.'),
      body: z.string().describe('Supporting subline text in ALL CAPS. Shorter than the headline.'),
      accentWords: z.array(z.string()).describe('Exact words/phrases from headline or body to highlight in brand red. Use sparingly — 1-3 key phrases max.'),
      logoPosition: z.enum(['top', 'bottom']).describe('Where to place the IdeaFuel logo. Use top for cleaner designs, bottom for statement-first designs.'),
      layout: z.enum(['headline-subline', 'centered-body']).describe('headline-subline: big headline + smaller body below. centered-body: single centered text block.'),
    })).min(1).max(10),
  }),
};

export function applyAccentMarkup(text: string, accentWords: string[]): string {
  let result = text;
  for (const word of accentWords) {
    result = result.replace(word, `{{accent}}${word}{{/accent}}`);
  }
  return result;
}

export function buildCampaignSystemPrompt(existingConcepts: Pick<AdConcept, 'headline' | 'body'>[]): string {
  const existingContext = existingConcepts.length > 0
    ? `\n\nExisting concepts in this campaign:\n${existingConcepts.map((c, i) => `${i + 1}. "${c.headline}" / "${c.body}"`).join('\n')}\n\nGenerate concepts that complement these — don't repeat the same angles.`
    : '';

  return `You are an expert copywriter for IdeaFuel, an AI-powered business idea validation platform. You write Meta ad copy in a voice that's blunt and direct (Mark Manson style) with contrarian, first-principles thinking (Peter Thiel style).

Your job is to generate typographic ad concepts. These are dark-background ads where the TEXT IS the creative — no images, no screenshots.

Guidelines:
- ALL CAPS for all text
- Headlines should be punchy, provocative, and stop the scroll
- Body text is a short supporting line (1 sentence max)
- Accent words are the 1-3 most emotionally charged words/phrases to highlight in brand red
- Think about what would make a first-time founder stop scrolling
- Attack competitors (ChatGPT, generic AI tools) with confidence, not desperation
- Mix headline-subline layouts (big statement + kicker) with centered-body layouts (single powerful statement)

Use the generate_ad_concepts tool to return your concepts.${existingContext}`;
}
```

- [ ] **Step 2: Create streaming chat route**

```typescript
// packages/web/src/app/api/campaigns/chat/route.ts

import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { auth } from '@/lib/auth';
import { db } from '@forge/server/db/drizzle';
import * as schema from '@forge/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { campaignChatRequestSchema } from '@forge/shared';
import { buildCampaignSystemPrompt, generateAdConceptsTool } from '@forge/server/services/meta-ads-ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const parsed = campaignChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid request', { status: 400 });
  }

  const { messages, campaignId } = parsed.data;

  // Verify campaign ownership
  const campaign = await db.query.campaigns.findFirst({
    where: and(eq(schema.campaigns.id, campaignId), eq(schema.campaigns.userId, userId)),
  });
  if (!campaign) {
    return new Response('Campaign not found', { status: 404 });
  }

  // Load existing concepts for context
  const existingConcepts = await db
    .select({ headline: schema.adConcepts.headline, body: schema.adConcepts.body })
    .from(schema.adConcepts)
    .where(eq(schema.adConcepts.campaignId, campaignId))
    .orderBy(asc(schema.adConcepts.order));

  const systemPrompt = buildCampaignSystemPrompt(existingConcepts);

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages as UIMessage[]),
    tools: {
      generate_ad_concepts: generateAdConceptsTool,
    },
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage }) => {
      try {
        // Persist chat messages
        const allMessages = [
          ...messages.map((m: { id: string; role: string; parts: Array<{ type?: string; text?: string }> }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.parts.find((p: { type?: string }) => p.type === 'text')?.text ?? '',
          })),
          {
            id: responseMessage.id,
            role: 'assistant' as const,
            content: responseMessage.parts?.find((p: { type: string }) => p.type === 'text')?.text ?? '',
          },
        ];
        await db
          .update(schema.campaigns)
          .set({ chatMessages: allMessages })
          .where(eq(schema.campaigns.id, campaignId));
      } catch (error) {
        console.error('[CampaignChat] Failed to save conversation:', error);
      }
    },
  });
}
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm type-check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/services/meta-ads-ai.ts packages/web/src/app/api/campaigns/chat/route.ts
git commit -m "feat: add meta ads AI service and streaming chat endpoint"
```

---

## Task 5: Accent Markup Utilities

**Files:**
- Create: `packages/web/src/components/meta-ads/accent-utils.ts`

- [ ] **Step 1: Create accent-utils.ts**

```typescript
// packages/web/src/components/meta-ads/accent-utils.ts

/**
 * Convert {{accent}}word{{/accent}} markup to HTML spans.
 * Returns an HTML string safe for dangerouslySetInnerHTML or contentEditable.
 */
export function accentMarkupToHtml(text: string): string {
  return text.replace(
    /\{\{accent\}\}(.*?)\{\{\/accent\}\}/g,
    '<span class="text-primary font-bold" data-accent="true">$1</span>'
  );
}

/**
 * Convert HTML with accent spans back to {{accent}} markup.
 * Used when reading innerHTML from a contentEditable element.
 */
export function htmlToAccentMarkup(html: string): string {
  // Replace accent spans back to markup
  let result = html.replace(
    /<span[^>]*data-accent="true"[^>]*>(.*?)<\/span>/g,
    '{{accent}}$1{{/accent}}'
  );
  // Strip any remaining HTML tags (stray <br>, <div> etc from contentEditable)
  result = result.replace(/<br\s*\/?>/g, '\n');
  result = result.replace(/<\/div><div>/g, '\n');
  result = result.replace(/<\/?div>/g, '');
  result = result.replace(/<\/?span[^>]*>/g, '');
  return result.trim();
}

/**
 * Toggle accent markup on a text selection range.
 * If the selected text is already inside an accent span, remove it.
 * Otherwise, wrap it in accent markup.
 */
export function toggleAccentOnSelection(element: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (!element.contains(range.commonAncestorContainer)) return;

  // Check if selection is inside an accent span
  const parentSpan = findAncestorAccentSpan(range.commonAncestorContainer);

  if (parentSpan) {
    // Remove accent: unwrap the span
    const parent = parentSpan.parentNode;
    if (parent) {
      while (parentSpan.firstChild) {
        parent.insertBefore(parentSpan.firstChild, parentSpan);
      }
      parent.removeChild(parentSpan);
    }
  } else {
    // Add accent: wrap selection in span
    const span = document.createElement('span');
    span.className = 'text-primary font-bold';
    span.setAttribute('data-accent', 'true');
    range.surroundContents(span);
  }

  selection.removeAllRanges();
}

function findAncestorAccentSpan(node: Node): HTMLElement | null {
  let current: Node | null = node;
  while (current) {
    if (
      current instanceof HTMLElement &&
      current.tagName === 'SPAN' &&
      current.getAttribute('data-accent') === 'true'
    ) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/meta-ads/accent-utils.ts
git commit -m "feat: add accent markup parse/serialize utilities"
```

---

## Task 6: Logo Mark Component

**Files:**
- Create: `packages/web/src/components/meta-ads/logo-mark.tsx`

- [ ] **Step 1: Create logo-mark.tsx**

This component renders the IdeaFuel logo as it appears in the ad mockups — monospace "IDEA" in white + "FUEL" in red with a flame icon between them.

```typescript
// packages/web/src/components/meta-ads/logo-mark.tsx

'use client';

interface LogoMarkProps {
  position: 'top' | 'bottom';
  onClick?: () => void;
}

export function LogoMark({ position, onClick }: LogoMarkProps) {
  return (
    <div
      className={`absolute left-0 right-0 flex items-center justify-center gap-1 cursor-pointer ${
        position === 'top' ? 'top-6' : 'bottom-6'
      }`}
      onClick={onClick}
      title="Click to toggle logo position"
    >
      <span className="font-mono text-xs tracking-[3px] text-white uppercase">
        Idea
      </span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        className="text-primary"
      >
        <path
          d="M12 2C8 2 6 5 6 8c0 4 6 10 6 10s6-6 6-10c0-3-2-6-6-6z"
          fill="currentColor"
        />
      </svg>
      <span className="font-mono text-xs tracking-[3px] text-primary uppercase">
        Fuel
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/meta-ads/logo-mark.tsx
git commit -m "feat: add IdeaFuel logo mark component for ad cards"
```

---

## Task 7: Editable Text Component

**Files:**
- Create: `packages/web/src/components/meta-ads/editable-text.tsx`

- [ ] **Step 1: Create editable-text.tsx**

```typescript
// packages/web/src/components/meta-ads/editable-text.tsx

'use client';

import { useRef, useCallback, useEffect } from 'react';
import { accentMarkupToHtml, htmlToAccentMarkup, toggleAccentOnSelection } from './accent-utils';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function EditableText({ value, onChange, className = '', placeholder = '' }: EditableTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  // Sync value → DOM only when value changes externally
  useEffect(() => {
    if (!ref.current) return;
    const currentMarkup = htmlToAccentMarkup(ref.current.innerHTML);
    if (currentMarkup !== value) {
      ref.current.innerHTML = accentMarkupToHtml(value) || `<span class="opacity-40">${placeholder}</span>`;
    }
  }, [value, placeholder]);

  const handleBlur = useCallback(() => {
    if (!ref.current) return;
    const newValue = htmlToAccentMarkup(ref.current.innerHTML);
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd+E to toggle accent
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      if (ref.current) {
        toggleAccentOnSelection(ref.current);
        // Trigger save after accent toggle
        const newValue = htmlToAccentMarkup(ref.current.innerHTML);
        if (newValue !== value) {
          onChange(newValue);
        }
      }
    }
  }, [value, onChange]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 -mx-1 ${className}`}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={() => { isComposing.current = false; }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/meta-ads/editable-text.tsx
git commit -m "feat: add contentEditable text component with accent markup support"
```

---

## Task 8: Ad Card Component

**Files:**
- Create: `packages/web/src/components/meta-ads/ad-card.tsx`

- [ ] **Step 1: Create ad-card.tsx**

This is the core component. Each card renders at its real pixel dimensions inside a scaled container, plus a hidden full-resolution node for export.

```typescript
// packages/web/src/components/meta-ads/ad-card.tsx

'use client';

import { useRef, forwardRef, useImperativeHandle } from 'react';
import type { AdSizeKey, AdLayout, LogoPosition } from '@forge/shared';
import { AD_SIZES } from '@forge/shared';
import { EditableText } from './editable-text';
import { LogoMark } from './logo-mark';

interface AdCardProps {
  sizeKey: AdSizeKey;
  headline: string;
  body: string;
  logoPosition: LogoPosition;
  layout: AdLayout;
  onHeadlineChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onLogoPositionToggle: () => void;
  previewScale?: number;
}

export interface AdCardExportHandle {
  getExportNode: () => HTMLDivElement | null;
}

export const AdCard = forwardRef<AdCardExportHandle, AdCardProps>(function AdCard(
  { sizeKey, headline, body, logoPosition, layout, onHeadlineChange, onBodyChange, onLogoPositionToggle, previewScale = 0.25 },
  ref
) {
  const exportRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getExportNode: () => exportRef.current,
  }));

  const size = AD_SIZES[sizeKey];

  // Typography scales per size
  const headlineClass = getHeadlineClass(sizeKey, layout);
  const bodyClass = getBodyClass(sizeKey, layout);

  const cardContent = (editable: boolean) => (
    <div className="relative w-full h-full bg-[#0A0A0A] flex flex-col items-center justify-center p-12">
      <LogoMark
        position={logoPosition}
        onClick={editable ? onLogoPositionToggle : undefined}
      />
      <div className={`flex flex-col ${layout === 'centered-body' ? 'items-center text-center' : 'items-start text-left'} gap-4 max-w-[85%]`}>
        {layout === 'headline-subline' ? (
          <>
            {editable ? (
              <EditableText
                value={headline}
                onChange={onHeadlineChange}
                className={headlineClass}
                placeholder="HEADLINE"
              />
            ) : (
              <div className={headlineClass} dangerouslySetInnerHTML={{ __html: headline }} />
            )}
            {editable ? (
              <EditableText
                value={body}
                onChange={onBodyChange}
                className={bodyClass}
                placeholder="BODY TEXT"
              />
            ) : (
              <div className={bodyClass} dangerouslySetInnerHTML={{ __html: body }} />
            )}
          </>
        ) : (
          editable ? (
            <EditableText
              value={headline || body}
              onChange={onHeadlineChange}
              className={bodyClass}
              placeholder="AD COPY"
            />
          ) : (
            <div className={bodyClass} dangerouslySetInnerHTML={{ __html: headline || body }} />
          )
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Preview (scaled down) */}
      <div className="relative overflow-hidden rounded-lg border border-border">
        <div
          style={{
            width: size.width * previewScale,
            height: size.height * previewScale,
          }}
        >
          <div
            style={{
              width: size.width,
              height: size.height,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}
          >
            {cardContent(true)}
          </div>
        </div>
        <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
          {size.label}
        </div>
      </div>

      {/* Export node (hidden, full resolution) */}
      <div
        ref={exportRef}
        style={{
          position: 'absolute',
          left: '-99999px',
          width: size.width,
          height: size.height,
        }}
      >
        {cardContent(false)}
      </div>
    </>
  );
});

function getHeadlineClass(sizeKey: AdSizeKey, layout: AdLayout): string {
  const base = 'font-display font-black text-white uppercase leading-[0.95]';
  if (layout === 'centered-body') return `${base} text-2xl`;
  switch (sizeKey) {
    case 'story':
      return `${base} text-[72px]`;
    case 'portrait':
      return `${base} text-[64px]`;
    case 'feed':
    case 'carousel':
      return `${base} text-[56px]`;
    case 'landscape':
      return `${base} text-[48px]`;
    default:
      return `${base} text-[56px]`;
  }
}

function getBodyClass(sizeKey: AdSizeKey, layout: AdLayout): string {
  const base = 'font-sans font-semibold text-white uppercase tracking-wide';
  if (layout === 'centered-body') {
    switch (sizeKey) {
      case 'story':
        return `${base} text-[28px] leading-relaxed`;
      case 'portrait':
        return `${base} text-[24px] leading-relaxed`;
      case 'feed':
      case 'carousel':
        return `${base} text-[20px] leading-relaxed`;
      case 'landscape':
        return `${base} text-[18px] leading-relaxed`;
      default:
        return `${base} text-[20px] leading-relaxed`;
    }
  }
  switch (sizeKey) {
    case 'story':
      return `${base} text-[24px]`;
    case 'portrait':
      return `${base} text-[20px]`;
    case 'feed':
    case 'carousel':
      return `${base} text-[18px]`;
    case 'landscape':
      return `${base} text-[16px]`;
    default:
      return `${base} text-[18px]`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/meta-ads/ad-card.tsx
git commit -m "feat: add ad card component with preview scaling and export node"
```

---

## Task 9: Campaign Context & Concept Group

**Files:**
- Create: `packages/web/src/components/meta-ads/campaign-context.tsx`
- Create: `packages/web/src/components/meta-ads/concept-group.tsx`

- [ ] **Step 1: Create campaign-context.tsx**

```typescript
// packages/web/src/components/meta-ads/campaign-context.tsx

'use client';

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import type { CampaignWithConcepts, AdConcept, LogoPosition, AdLayout, AdSizeKey } from '@forge/shared';
import { trpc } from '@/lib/trpc/client';

interface CampaignContextValue {
  campaign: CampaignWithConcepts;
  concepts: AdConcept[];
  isLoading: boolean;
  updateConcept: (id: string, data: Partial<Pick<AdConcept, 'headline' | 'body' | 'logoPosition' | 'layout'>>) => void;
  addConcepts: (concepts: Array<{ headline: string; body: string; logoPosition: LogoPosition; layout: AdLayout }>) => void;
  removeConcept: (id: string) => void;
  reorderConcepts: (ids: string[]) => void;
  // Export state
  selectedConceptIds: Set<string>;
  toggleConceptSelection: (id: string) => void;
  selectAllConcepts: () => void;
  deselectAllConcepts: () => void;
  visibleSizes: Set<AdSizeKey>;
  toggleSizeVisibility: (size: AdSizeKey) => void;
}

const CampaignCtx = createContext<CampaignContextValue | null>(null);

export function useCampaignContext() {
  const ctx = useContext(CampaignCtx);
  if (!ctx) throw new Error('useCampaignContext must be used within CampaignProvider');
  return ctx;
}

interface CampaignProviderProps {
  campaignId: string;
  children: ReactNode;
}

export function CampaignProvider({ campaignId, children }: CampaignProviderProps) {
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.campaign.get.useQuery({ id: campaignId });

  const updateConceptMut = trpc.campaign.updateConcept.useMutation({
    onSuccess: () => utils.campaign.get.invalidate({ id: campaignId }),
  });

  const addConceptsMut = trpc.campaign.addConcepts.useMutation({
    onSuccess: () => utils.campaign.get.invalidate({ id: campaignId }),
  });

  const removeConceptMut = trpc.campaign.removeConcept.useMutation({
    onSuccess: () => utils.campaign.get.invalidate({ id: campaignId }),
  });

  const reorderConceptsMut = trpc.campaign.reorderConcepts.useMutation({
    onSuccess: () => utils.campaign.get.invalidate({ id: campaignId }),
  });

  // Selection state for export
  const [selectedConceptIds, setSelectedConceptIds] = useState<Set<string>>(new Set());
  const [visibleSizes, setVisibleSizes] = useState<Set<AdSizeKey>>(
    new Set(['feed', 'portrait', 'story', 'carousel', 'landscape'])
  );

  const updateConcept = useCallback((id: string, updates: Partial<Pick<AdConcept, 'headline' | 'body' | 'logoPosition' | 'layout'>>) => {
    updateConceptMut.mutate({ id, ...updates });
  }, [updateConceptMut]);

  const addConcepts = useCallback((concepts: Array<{ headline: string; body: string; logoPosition: LogoPosition; layout: AdLayout }>) => {
    addConceptsMut.mutate({ campaignId, concepts });
  }, [addConceptsMut, campaignId]);

  const removeConcept = useCallback((id: string) => {
    removeConceptMut.mutate({ id });
  }, [removeConceptMut]);

  const reorderConcepts = useCallback((ids: string[]) => {
    reorderConceptsMut.mutate({ campaignId, conceptIds: ids });
  }, [reorderConceptsMut, campaignId]);

  const toggleConceptSelection = useCallback((id: string) => {
    setSelectedConceptIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllConcepts = useCallback(() => {
    if (data?.concepts) {
      setSelectedConceptIds(new Set(data.concepts.map(c => c.id)));
    }
  }, [data?.concepts]);

  const deselectAllConcepts = useCallback(() => {
    setSelectedConceptIds(new Set());
  }, []);

  const toggleSizeVisibility = useCallback((size: AdSizeKey) => {
    setVisibleSizes(prev => {
      const next = new Set(prev);
      if (next.has(size)) next.delete(size);
      else next.add(size);
      return next;
    });
  }, []);

  if (!data) return null;

  return (
    <CampaignCtx.Provider value={{
      campaign: data,
      concepts: data.concepts,
      isLoading,
      updateConcept,
      addConcepts,
      removeConcept,
      reorderConcepts,
      selectedConceptIds,
      toggleConceptSelection,
      selectAllConcepts,
      deselectAllConcepts,
      visibleSizes,
      toggleSizeVisibility,
    }}>
      {children}
    </CampaignCtx.Provider>
  );
}
```

Note: Add `import { useState } from 'react';` to the existing react import at the top.

- [ ] **Step 2: Create concept-group.tsx**

```typescript
// packages/web/src/components/meta-ads/concept-group.tsx

'use client';

import { useRef, useCallback } from 'react';
import type { AdConcept, AdSizeKey } from '@forge/shared';
import { AD_SIZES } from '@forge/shared';
import { AdCard, type AdCardExportHandle } from './ad-card';
import { useCampaignContext } from './campaign-context';
import { Trash2, Download } from 'lucide-react';

interface ConceptGroupProps {
  concept: AdConcept;
  previewScale?: number;
  onExportConcept?: (conceptId: string) => void;
}

export function ConceptGroup({ concept, previewScale = 0.25, onExportConcept }: ConceptGroupProps) {
  const { updateConcept, removeConcept, selectedConceptIds, toggleConceptSelection, visibleSizes } = useCampaignContext();
  const cardRefs = useRef<Map<AdSizeKey, AdCardExportHandle>>(new Map());

  const setCardRef = useCallback((sizeKey: AdSizeKey) => (handle: AdCardExportHandle | null) => {
    if (handle) cardRefs.current.set(sizeKey, handle);
    else cardRefs.current.delete(sizeKey);
  }, []);

  const isSelected = selectedConceptIds.has(concept.id);

  const toggleLogoPosition = useCallback(() => {
    updateConcept(concept.id, {
      logoPosition: concept.logoPosition === 'top' ? 'bottom' : 'top',
    });
  }, [concept.id, concept.logoPosition, updateConcept]);

  const toggleLayout = useCallback(() => {
    updateConcept(concept.id, {
      layout: concept.layout === 'headline-subline' ? 'centered-body' : 'headline-subline',
    });
  }, [concept.id, concept.layout, updateConcept]);

  const sizeKeys = (Object.keys(AD_SIZES) as AdSizeKey[]).filter(k => visibleSizes.has(k));

  return (
    <div className={`rounded-xl border p-4 ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleConceptSelection(concept.id)}
            className="rounded border-border"
          />
          <span className="text-sm text-muted-foreground font-mono truncate max-w-xs">
            {concept.headline.replace(/\{\{accent\}\}|\{\{\/accent\}\}/g, '').slice(0, 40)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLayout}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border"
          >
            {concept.layout === 'headline-subline' ? 'H+B' : 'CTR'}
          </button>
          <button
            onClick={() => onExportConcept?.(concept.id)}
            className="text-muted-foreground hover:text-foreground p-1"
            title="Export this concept"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => removeConcept(concept.id)}
            className="text-muted-foreground hover:text-destructive p-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="flex flex-wrap gap-3">
        {sizeKeys.map(sizeKey => (
          <AdCard
            key={sizeKey}
            ref={setCardRef(sizeKey)}
            sizeKey={sizeKey}
            headline={concept.headline}
            body={concept.body}
            logoPosition={concept.logoPosition}
            layout={concept.layout}
            onHeadlineChange={(v) => updateConcept(concept.id, { headline: v })}
            onBodyChange={(v) => updateConcept(concept.id, { body: v })}
            onLogoPositionToggle={toggleLogoPosition}
            previewScale={previewScale}
          />
        ))}
      </div>
    </div>
  );
}

// Expose refs for export
ConceptGroup.displayName = 'ConceptGroup';
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/meta-ads/campaign-context.tsx packages/web/src/components/meta-ads/concept-group.tsx
git commit -m "feat: add campaign context provider and concept group component"
```

---

## Task 10: Export Utilities

**Files:**
- Create: `packages/web/src/components/meta-ads/export-utils.ts`

- [ ] **Step 1: Install dependencies**

Run: `pnpm --filter @forge/web add html-to-image jszip file-saver && pnpm --filter @forge/web add -D @types/file-saver`

- [ ] **Step 2: Create export-utils.ts**

```typescript
// packages/web/src/components/meta-ads/export-utils.ts

import { toPng, toJpeg } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { AdSizeKey } from '@forge/shared';
import { AD_SIZES } from '@forge/shared';

export type ExportFormat = 'png' | 'jpg';

interface ExportItem {
  conceptIndex: number;
  headlineSlug: string;
  sizeKey: AdSizeKey;
  node: HTMLDivElement;
}

function slugify(text: string): string {
  return text
    .replace(/\{\{accent\}\}|\{\{\/accent\}\}/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

async function captureNode(node: HTMLDivElement, format: ExportFormat, quality = 0.92): Promise<Blob> {
  const options = {
    width: node.offsetWidth,
    height: node.offsetHeight,
    pixelRatio: 1,
    style: {
      position: 'static',
      left: '0',
    },
  };

  const dataUrl = format === 'png'
    ? await toPng(node, options)
    : await toJpeg(node, { ...options, quality });

  const res = await fetch(dataUrl);
  return res.blob();
}

export async function exportItems(
  items: ExportItem[],
  campaignName: string,
  format: ExportFormat = 'png',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const campaignSlug = slugify(campaignName) || 'campaign';

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const size = AD_SIZES[item.sizeKey];
    const folderName = `${item.conceptIndex + 1}-${item.headlineSlug}`;
    const fileName = `${item.sizeKey}-${size.width}x${size.height}.${format}`;

    const blob = await captureNode(item.node, format);
    zip.file(`${campaignSlug}/${folderName}/${fileName}`, blob);

    onProgress?.(i + 1, items.length);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `${campaignSlug}-ads.zip`);
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/meta-ads/export-utils.ts
git commit -m "feat: add bulk export utilities with html-to-image and jszip"
```

---

## Task 11: Canvas Toolbar

**Files:**
- Create: `packages/web/src/components/meta-ads/canvas-toolbar.tsx`

- [ ] **Step 1: Create canvas-toolbar.tsx**

```typescript
// packages/web/src/components/meta-ads/canvas-toolbar.tsx

'use client';

import { useState } from 'react';
import { AD_SIZES, type AdSizeKey } from '@forge/shared';
import { useCampaignContext } from './campaign-context';
import { Download, Check, Grid, LayoutList } from 'lucide-react';
import type { ExportFormat } from './export-utils';

interface CanvasToolbarProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onExport: (format: ExportFormat, scope: 'all' | 'selected') => void;
  isExporting: boolean;
  exportProgress: { current: number; total: number } | null;
}

export function CanvasToolbar({ viewMode, onViewModeChange, onExport, isExporting, exportProgress }: CanvasToolbarProps) {
  const { visibleSizes, toggleSizeVisibility, selectedConceptIds, selectAllConcepts, deselectAllConcepts, concepts } = useCampaignContext();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');

  const allSelected = concepts.length > 0 && selectedConceptIds.size === concepts.length;
  const someSelected = selectedConceptIds.size > 0;

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-card">
      {/* Left: View & Size controls */}
      <div className="flex items-center gap-4">
        {/* View toggle */}
        <div className="flex items-center rounded-full border border-border overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Grid size={14} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutList size={14} />
          </button>
        </div>

        {/* Size filters */}
        <div className="flex items-center gap-1">
          {(Object.keys(AD_SIZES) as AdSizeKey[]).map(key => (
            <button
              key={key}
              onClick={() => toggleSizeVisibility(key)}
              className={`text-xs px-2 py-1 rounded-full border ${
                visibleSizes.has(key)
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {AD_SIZES[key].label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Selection & Export */}
      <div className="flex items-center gap-3">
        {/* Select all / none */}
        <button
          onClick={allSelected ? deselectAllConcepts : selectAllConcepts}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Check size={12} />
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>

        {/* Format toggle */}
        <div className="flex items-center rounded-full border border-border overflow-hidden text-xs">
          <button
            onClick={() => setExportFormat('png')}
            className={`px-2 py-1 ${exportFormat === 'png' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            PNG
          </button>
          <button
            onClick={() => setExportFormat('jpg')}
            className={`px-2 py-1 ${exportFormat === 'jpg' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            JPG
          </button>
        </div>

        {/* Export buttons */}
        <button
          onClick={() => onExport(exportFormat, someSelected ? 'selected' : 'all')}
          disabled={isExporting}
          className="flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Download size={12} />
          {isExporting && exportProgress
            ? `${exportProgress.current}/${exportProgress.total}`
            : someSelected
              ? `Export ${selectedConceptIds.size} selected`
              : 'Export all'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/meta-ads/canvas-toolbar.tsx
git commit -m "feat: add canvas toolbar with size filters, selection, and export controls"
```

---

## Task 12: Ad Canvas (Orchestrator)

**Files:**
- Create: `packages/web/src/components/meta-ads/ad-canvas.tsx`

- [ ] **Step 1: Create ad-canvas.tsx**

```typescript
// packages/web/src/components/meta-ads/ad-canvas.tsx

'use client';

import { useState, useCallback, useRef } from 'react';
import type { AdSizeKey } from '@forge/shared';
import { AD_SIZES } from '@forge/shared';
import { useCampaignContext } from './campaign-context';
import { ConceptGroup } from './concept-group';
import { CanvasToolbar } from './canvas-toolbar';
import { exportItems, type ExportFormat } from './export-utils';
import type { AdCardExportHandle } from './ad-card';

export function AdCanvas() {
  const { campaign, concepts, selectedConceptIds, visibleSizes } = useCampaignContext();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  // Collect export nodes from all concept groups
  // We'll use a registry pattern — each AdCard registers its export handle
  const exportRegistry = useRef<Map<string, Map<AdSizeKey, AdCardExportHandle>>>(new Map());

  const registerExportHandle = useCallback((conceptId: string, sizeKey: AdSizeKey, handle: AdCardExportHandle | null) => {
    if (!exportRegistry.current.has(conceptId)) {
      exportRegistry.current.set(conceptId, new Map());
    }
    const conceptMap = exportRegistry.current.get(conceptId)!;
    if (handle) conceptMap.set(sizeKey, handle);
    else conceptMap.delete(sizeKey);
  }, []);

  const handleExport = useCallback(async (format: ExportFormat, scope: 'all' | 'selected') => {
    setIsExporting(true);
    setExportProgress(null);

    const targetConcepts = scope === 'selected'
      ? concepts.filter(c => selectedConceptIds.has(c.id))
      : concepts;

    const sizeKeys = (Object.keys(AD_SIZES) as AdSizeKey[]).filter(k => visibleSizes.has(k));

    // Collect all export nodes
    const items: Array<{
      conceptIndex: number;
      headlineSlug: string;
      sizeKey: AdSizeKey;
      node: HTMLDivElement;
    }> = [];

    targetConcepts.forEach((concept, idx) => {
      const conceptHandles = exportRegistry.current.get(concept.id);
      if (!conceptHandles) return;

      const slug = concept.headline
        .replace(/\{\{accent\}\}|\{\{\/accent\}\}/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);

      sizeKeys.forEach(sizeKey => {
        const handle = conceptHandles.get(sizeKey);
        const node = handle?.getExportNode();
        if (node) {
          items.push({ conceptIndex: idx, headlineSlug: slug, sizeKey, node });
        }
      });
    });

    if (items.length === 0) {
      setIsExporting(false);
      return;
    }

    await exportItems(items, campaign.name, format, (current, total) => {
      setExportProgress({ current, total });
    });

    setIsExporting(false);
    setExportProgress(null);
  }, [concepts, selectedConceptIds, visibleSizes, campaign.name]);

  return (
    <div className="flex flex-col h-full">
      <CanvasToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExport={handleExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {concepts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-center">
              Describe your campaign angle in the chat<br />
              <span className="text-sm">AI will generate ad concepts here</span>
            </p>
          </div>
        ) : (
          concepts.map(concept => (
            <ConceptGroup
              key={concept.id}
              concept={concept}
              previewScale={viewMode === 'grid' ? 0.2 : 0.3}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

**Note:** The export registry pattern here needs the `ConceptGroup` to pass export handles up. Update `concept-group.tsx` to accept and call a `registerExportHandle` prop, or use a simpler approach: query the DOM for `[data-export-node]` elements at export time. The simpler DOM approach:

Update `ad-card.tsx` export node to include a data attribute:

```typescript
// In AdCard, add to the export node div:
data-export-concept={conceptId}
data-export-size={sizeKey}
```

Then in `handleExport`, query:
```typescript
const nodes = document.querySelectorAll<HTMLDivElement>('[data-export-concept][data-export-size]');
```

This is simpler than threading refs through 3 layers of components. Update the `AdCard` props to accept `conceptId` and add the data attributes to the export div.

- [ ] **Step 2: Update ad-card.tsx to add data attributes on export node**

Add `conceptId: string` to `AdCardProps`. Update the export node div:

```typescript
<div
  ref={exportRef}
  data-export-concept={conceptId}
  data-export-size={sizeKey}
  style={{
    position: 'absolute',
    left: '-99999px',
    width: size.width,
    height: size.height,
  }}
>
```

Update `concept-group.tsx` to pass `conceptId={concept.id}` to each `AdCard`.

- [ ] **Step 3: Simplify handleExport to use DOM query**

Replace the registry pattern in `ad-canvas.tsx` with:

```typescript
const handleExport = useCallback(async (format: ExportFormat, scope: 'all' | 'selected') => {
  setIsExporting(true);
  setExportProgress(null);

  const targetConceptIds = scope === 'selected'
    ? new Set(selectedConceptIds)
    : new Set(concepts.map(c => c.id));

  const sizeKeys = new Set(
    (Object.keys(AD_SIZES) as AdSizeKey[]).filter(k => visibleSizes.has(k))
  );

  const items: Array<{
    conceptIndex: number;
    headlineSlug: string;
    sizeKey: AdSizeKey;
    node: HTMLDivElement;
  }> = [];

  const allNodes = document.querySelectorAll<HTMLDivElement>('[data-export-concept][data-export-size]');
  allNodes.forEach(node => {
    const conceptId = node.getAttribute('data-export-concept')!;
    const sizeKey = node.getAttribute('data-export-size') as AdSizeKey;

    if (!targetConceptIds.has(conceptId) || !sizeKeys.has(sizeKey)) return;

    const concept = concepts.find(c => c.id === conceptId);
    if (!concept) return;

    const conceptIndex = concepts.indexOf(concept);
    const slug = concept.headline
      .replace(/\{\{accent\}\}|\{\{\/accent\}\}/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    items.push({ conceptIndex, headlineSlug: slug, sizeKey, node });
  });

  if (items.length === 0) {
    setIsExporting(false);
    return;
  }

  await exportItems(items, campaign.name, format, (current, total) => {
    setExportProgress({ current, total });
  });

  setIsExporting(false);
  setExportProgress(null);
}, [concepts, selectedConceptIds, visibleSizes, campaign.name]);
```

Remove the `exportRegistry` ref and `registerExportHandle` callback.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/meta-ads/ad-canvas.tsx packages/web/src/components/meta-ads/ad-card.tsx packages/web/src/components/meta-ads/concept-group.tsx
git commit -m "feat: add ad canvas orchestrator with DOM-based export collection"
```

---

## Task 13: Campaign Chat Component

**Files:**
- Create: `packages/web/src/components/meta-ads/campaign-chat.tsx`

- [ ] **Step 1: Create campaign-chat.tsx**

```typescript
// packages/web/src/components/meta-ads/campaign-chat.tsx

'use client';

import { useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useCampaignContext } from './campaign-context';
import { applyAccentMarkup } from '@forge/server/services/meta-ads-ai';
import { Send } from 'lucide-react';

export function CampaignChat() {
  const { campaign, addConcepts } = useCampaignContext();

  // Restore chat history from campaign
  const initialMessages = useMemo<UIMessage[]>(() => {
    if (!campaign.chatMessages?.length) return [];
    return campaign.chatMessages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      parts: [{ type: 'text' as const, text: m.content }],
    }));
  }, [campaign.chatMessages]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/campaigns/chat',
      body: { campaignId: campaign.id },
    }),
    [campaign.id]
  );

  const { messages, status, sendMessage } = useChat({
    transport,
    messages: initialMessages,
    onToolCall({ toolCall }) {
      if (toolCall.toolName === 'generate_ad_concepts') {
        const args = toolCall.args as {
          concepts: Array<{
            headline: string;
            body: string;
            accentWords: string[];
            logoPosition: 'top' | 'bottom';
            layout: 'headline-subline' | 'centered-body';
          }>;
        };
        // Convert accentWords to markup and add concepts
        const conceptsWithMarkup = args.concepts.map(c => ({
          headline: applyAccentMarkup(c.headline, c.accentWords),
          body: applyAccentMarkup(c.body, c.accentWords),
          logoPosition: c.logoPosition,
          layout: c.layout,
        }));
        addConcepts(conceptsWithMarkup);
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('message') as HTMLInputElement;
    const text = input.value.trim();
    if (!text || isLoading) return;
    sendMessage({ role: 'user', parts: [{ type: 'text', text }] });
    input.value = '';
  }, [sendMessage, isLoading]);

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-muted-foreground text-sm text-center mt-8">
            <p className="font-medium mb-2">Describe your campaign</p>
            <p className="text-xs">e.g. &quot;Attack the ChatGPT business plan angle, target first-time founders&quot;</p>
          </div>
        )}
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}
            >
              {message.parts
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((part, i) => (
                  <p key={i}>{part.text}</p>
                ))}
              {message.parts.some(p => p.type === 'tool-invocation') && (
                <p className="text-xs opacity-70 mt-1 italic">Generated ad concepts</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.1s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            name="message"
            type="text"
            placeholder="Describe your ad angle..."
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-primary text-primary-foreground p-2 hover:bg-primary/90 disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Important:** The `applyAccentMarkup` import from the server package may not work directly in client components. Move `applyAccentMarkup` to `accent-utils.ts` instead:

```typescript
// Add to packages/web/src/components/meta-ads/accent-utils.ts

export function applyAccentMarkup(text: string, accentWords: string[]): string {
  let result = text;
  for (const word of accentWords) {
    result = result.replace(word, `{{accent}}${word}{{/accent}}`);
  }
  return result;
}
```

Update the import in `campaign-chat.tsx` to:
```typescript
import { applyAccentMarkup } from './accent-utils';
```

And keep the same function in `meta-ads-ai.ts` on the server side (it's small enough that duplication is fine to avoid cross-package client/server import issues).

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/meta-ads/campaign-chat.tsx packages/web/src/components/meta-ads/accent-utils.ts
git commit -m "feat: add campaign chat component with AI tool call handling"
```

---

## Task 14: Campaign Pages

**Files:**
- Create: `packages/web/src/app/(dashboard)/campaigns/page.tsx`
- Create: `packages/web/src/app/(dashboard)/campaigns/[id]/page.tsx`

- [ ] **Step 1: Create campaign list page**

```typescript
// packages/web/src/app/(dashboard)/campaigns/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';

export default function CampaignsPage() {
  const router = useRouter();
  const { data: campaigns, isLoading } = trpc.campaign.list.useQuery();
  const [isCreating, setIsCreating] = useState(false);

  const createMutation = trpc.campaign.create.useMutation({
    onSuccess: (campaign) => {
      router.push(`/campaigns/${campaign.id}`);
    },
    onSettled: () => setIsCreating(false),
  });

  const handleCreate = () => {
    setIsCreating(true);
    createMutation.mutate({ name: 'Untitled Campaign' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Ad Campaigns</h1>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      {!campaigns?.length ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="mb-2">No campaigns yet</p>
          <p className="text-sm">Create one to start generating Meta ad creatives</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {campaigns.map(campaign => (
            <Card
              key={campaign.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium">{campaign.name}</h3>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{campaign.description}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create campaign workspace page**

```typescript
// packages/web/src/app/(dashboard)/campaigns/[id]/page.tsx

'use client';

import { use } from 'react';
import { CampaignProvider } from '@/components/meta-ads/campaign-context';
import { CampaignChat } from '@/components/meta-ads/campaign-chat';
import { AdCanvas } from '@/components/meta-ads/ad-canvas';

export default function CampaignWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <CampaignProvider campaignId={id}>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left: Chat (fixed width) */}
        <div className="w-[380px] flex-shrink-0">
          <CampaignChat />
        </div>
        {/* Right: Ad Canvas (fills remaining space) */}
        <div className="flex-1 min-w-0">
          <AdCanvas />
        </div>
      </div>
    </CampaignProvider>
  );
}
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm type-check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/\(dashboard\)/campaigns/page.tsx packages/web/src/app/\(dashboard\)/campaigns/\[id\]/page.tsx
git commit -m "feat: add campaign list and workspace pages"
```

---

## Task 15: Add Navigation Link

**Files:**
- Modify: Dashboard sidebar/navigation component (wherever nav links are defined)

- [ ] **Step 1: Find the sidebar navigation component**

Run: `grep -rn "projects\|dashboard\|reports" packages/web/src/components/layout/ --include="*.tsx" -l`

Look for where nav links like `/projects`, `/reports` are defined.

- [ ] **Step 2: Add Campaigns link**

Add a new nav item to the sidebar, after the existing entries:

```typescript
{
  label: 'Campaigns',
  href: '/campaigns',
  icon: Megaphone, // from lucide-react
}
```

Import `Megaphone` from `lucide-react`.

- [ ] **Step 3: Verify the page loads**

Run: `pnpm dev:web`
Navigate to `http://localhost:3006/campaigns`
Expected: Campaign list page renders with "New Campaign" button

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/layout/
git commit -m "feat: add Campaigns nav link to dashboard sidebar"
```

---

## Task 16: Integration Test — Full Flow

- [ ] **Step 1: Create a campaign**

Navigate to `/campaigns`, click "New Campaign". Should redirect to `/campaigns/[id]`.

Expected: Split-pane layout — empty chat on left, empty canvas with placeholder message on right.

- [ ] **Step 2: Test AI chat**

Type: "Attack the ChatGPT business plan angle, target first-time founders who are tired of generic AI output"

Expected: AI responds via streaming, calls `generate_ad_concepts` tool, concepts appear on the canvas as cards across all 5 sizes.

- [ ] **Step 3: Test inline editing**

Click on a headline in any card. Edit the text. Click away (blur).

Expected: Text updates and persists.

- [ ] **Step 4: Test accent toggle**

Select a word in a headline, press `Cmd+E`.

Expected: Word turns red (accent color). Press `Cmd+E` again to remove.

- [ ] **Step 5: Test logo toggle**

Click the IdeaFuel logo on any card.

Expected: Logo moves from bottom to top (or vice versa).

- [ ] **Step 6: Test export**

Click "Export all" with PNG selected.

Expected: Browser downloads a zip file with folder structure `campaign-name/concept-slug/size.png`.

- [ ] **Step 7: Test selective export**

Check two concepts, click "Export 2 selected".

Expected: Zip contains only those two concepts.

- [ ] **Step 8: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes for meta ads content engine"
```

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import slugify from 'slugify';
import { eq, and, ne, desc } from 'drizzle-orm';
import { router, publicProcedure, adminProcedure } from '../trpc';
import { blogPosts } from '../db/schema';
import type { BlogPostStatus } from '../db/schema';

/**
 * Calculate reading time from TipTap JSON content
 */
function calculateReadingTime(content: unknown): { readingTime: string; wordCount: number } {
  // Extract text from TipTap JSON
  let text = '';

  function extractText(node: unknown): void {
    if (!node || typeof node !== 'object') return;

    const n = node as Record<string, unknown>;

    if (n.type === 'text' && typeof n.text === 'string') {
      text += n.text + ' ';
    }

    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        extractText(child);
      }
    }
  }

  extractText(content);

  // Count words and calculate reading time
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  return {
    readingTime: `${minutes} min read`,
    wordCount,
  };
}

/**
 * Generate unique slug from title
 */
async function generateUniqueSlug(
  db: { query: { blogPosts: { findFirst: (args: object) => Promise<{ id: string } | undefined> } } },
  title: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const conditions = excludeId
      ? and(eq(blogPosts.slug, slug), ne(blogPosts.id, excludeId))
      : eq(blogPosts.slug, slug);

    const existing = await db.query.blogPosts.findFirst({
      where: conditions,
      columns: { id: true },
    });

    if (!existing) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// Input schemas
const blogPostInput = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().optional(), // Auto-generated if not provided
  description: z.string().max(500).optional(),
  content: z.any(), // TipTap JSON
  coverImage: z.string().url().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).default('DRAFT'),
  tags: z.array(z.string()).default([]),
});

export const blogRouter = router({
  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * List published blog posts (cursor pagination)
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
        tag: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { sql: rawSql, lt } = await import('drizzle-orm');
      const conditions = [eq(blogPosts.status, 'PUBLISHED')];
      if (input.tag) {
        conditions.push(rawSql`${blogPosts.tags} @> ARRAY[${input.tag}]::text[]`);
      }
      if (input.cursor) {
        // Cursor pagination: get records after the cursor record (ordered by publishedAt DESC)
        conditions.push(
          rawSql`(${blogPosts.publishedAt}, ${blogPosts.id}) < (SELECT "publishedAt", "id" FROM "BlogPost" WHERE "id" = ${input.cursor})`,
        );
      }

      const posts = await ctx.db.query.blogPosts.findMany({
        where: and(...conditions),
        limit: input.limit + 1,
        orderBy: desc(blogPosts.publishedAt),
        columns: {
          id: true,
          slug: true,
          title: true,
          description: true,
          coverImage: true,
          publishedAt: true,
          readingTime: true,
          tags: true,
        },
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (posts.length > input.limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: posts,
        nextCursor,
      };
    }),

  /**
   * Get a single published post by slug
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.query.blogPosts.findFirst({
        where: and(eq(blogPosts.slug, input.slug), eq(blogPosts.status, 'PUBLISHED')),
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Blog post not found',
        });
      }

      return post;
    }),

  /**
   * Get all unique tags from published posts
   */
  getTags: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.db.query.blogPosts.findMany({
      where: eq(blogPosts.status, 'PUBLISHED'),
      columns: { tags: true },
    });

    const tagCounts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }),

  // ==========================================================================
  // ADMIN ENDPOINTS
  // ==========================================================================

  /**
   * List all posts (including drafts) for admin
   */
  adminList: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { sql: rawSql } = await import('drizzle-orm');
      const conditions = [];
      if (input.status) conditions.push(eq(blogPosts.status, input.status));
      if (input.cursor) {
        conditions.push(
          rawSql`(${blogPosts.updatedAt}, ${blogPosts.id}) < (SELECT "updatedAt", "id" FROM "BlogPost" WHERE "id" = ${input.cursor})`,
        );
      }

      const posts = await ctx.db.query.blogPosts.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: input.limit + 1,
        orderBy: desc(blogPosts.updatedAt),
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (posts.length > input.limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: posts,
        nextCursor,
      };
    }),

  /**
   * Get a single post by ID for editing
   */
  adminGet: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.query.blogPosts.findFirst({
        where: eq(blogPosts.id, input.id),
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Blog post not found',
        });
      }

      return post;
    }),

  /**
   * Create a new blog post
   */
  create: adminProcedure
    .input(blogPostInput)
    .mutation(async ({ ctx, input }) => {
      const slug = input.slug || await generateUniqueSlug(ctx.db, input.title);
      const { readingTime, wordCount } = calculateReadingTime(input.content);

      const [post] = await ctx.db.insert(blogPosts).values({
        slug,
        title: input.title,
        description: input.description,
        content: input.content,
        coverImage: input.coverImage,
        status: input.status as BlogPostStatus,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
        readingTime,
        wordCount,
        tags: input.tags,
        authorId: ctx.userId,
      }).returning();

      return post;
    }),

  /**
   * Update an existing blog post
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: blogPostInput.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.blogPosts.findFirst({
        where: eq(blogPosts.id, input.id),
        columns: { id: true, status: true, publishedAt: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Blog post not found',
        });
      }

      // Handle slug generation if title changed
      let slug: string | undefined;
      if (input.data.title && !input.data.slug) {
        slug = await generateUniqueSlug(ctx.db, input.data.title, input.id);
      } else if (input.data.slug) {
        slug = input.data.slug;
      }

      // Calculate reading time if content changed
      let readingTime: string | undefined;
      let wordCount: number | undefined;
      if (input.data.content) {
        const calc = calculateReadingTime(input.data.content);
        readingTime = calc.readingTime;
        wordCount = calc.wordCount;
      }

      // Set publishedAt when transitioning to PUBLISHED
      let publishedAt: Date | null | undefined;
      if (input.data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
        publishedAt = new Date();
      } else if (input.data.status && input.data.status !== 'PUBLISHED') {
        // Keep existing publishedAt for archive, clear for draft
        publishedAt = input.data.status === 'DRAFT' ? null : undefined;
      }

      const [post] = await ctx.db
        .update(blogPosts)
        .set({
          ...(slug && { slug }),
          ...(input.data.title && { title: input.data.title }),
          ...(input.data.description !== undefined && { description: input.data.description }),
          ...(input.data.content && { content: input.data.content }),
          ...(input.data.coverImage !== undefined && { coverImage: input.data.coverImage }),
          ...(input.data.status && { status: input.data.status as BlogPostStatus }),
          ...(publishedAt !== undefined && { publishedAt }),
          ...(readingTime && { readingTime }),
          ...(wordCount !== undefined && { wordCount }),
          ...(input.data.tags && { tags: input.data.tags }),
        })
        .where(eq(blogPosts.id, input.id))
        .returning();

      return post;
    }),

  /**
   * Delete a blog post
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.blogPosts.findFirst({
        where: eq(blogPosts.id, input.id),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Blog post not found',
        });
      }

      await ctx.db.delete(blogPosts).where(eq(blogPosts.id, input.id));

      return { success: true };
    }),
});

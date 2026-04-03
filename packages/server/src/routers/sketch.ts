import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { SKETCH_TEMPLATE_TYPES } from '@forge/shared/constants';
import { getGeminiClient } from '../lib/gemini';
import { buildSketchPrompt } from '../lib/sketch-prompts';
import { supabase, ATTACHMENT_BUCKET } from '../lib/supabase';
import { notes, noteAttachments, projectAttachments, projects, sandboxes } from '../db/schema';
import type { Part } from '@google/generative-ai';

const generateSchema = z.object({
  templateType: z.enum(SKETCH_TEMPLATE_TYPES),
  description: z.string().min(1).max(500),
  referenceImageKey: z.string().optional(),
  annotations: z.boolean(),
});

const pinSchema = z.object({
  imageUrl: z.string().url(),
  storagePath: z.string(),
  targetType: z.enum(['sandbox', 'vault']),
  targetId: z.string().min(1),
});

export const sketchRouter = router({
  /**
   * Generate a sketch image using Gemini image generation.
   * Optionally accepts a reference image from Supabase Storage.
   * Returns a sketch ID, public image URL, and storage path.
   */
  generate: protectedProcedure
    .input(generateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!supabase) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Storage not configured',
        });
      }

      const prompt = buildSketchPrompt({
        templateType: input.templateType,
        description: input.description,
        annotations: input.annotations,
      });

      // Build content parts — start with the text prompt
      const parts: Part[] = [{ text: prompt }];

      // If a reference image was provided, download it and include as inline data
      if (input.referenceImageKey) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .download(input.referenceImageKey);

        if (downloadError || !fileData) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Failed to download reference image',
          });
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64,
          },
        });
      }

      // Call Gemini image generation
      // Note: responseModalities is a newer field not yet in the v0.24.1 type definitions
      // but is supported at runtime for gemini-2.0-flash-exp and similar models.
      let imageBase64: string;
      try {
        const gemini = getGeminiClient();
        const model = gemini.getGenerativeModel({
          model: 'gemini-2.0-flash-exp',
          generationConfig: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            responseModalities: ['image', 'text'],
          } as any,
        });

        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
        const response = result.response;
        const candidates = response.candidates ?? [];

        // Find the inlineData part in the response that contains the generated image
        let foundImage: string | null = null;
        for (const candidate of candidates) {
          for (const part of candidate.content.parts) {
            const p = part as Part & { inlineData?: { mimeType: string; data: string } };
            if (p.inlineData?.data) {
              foundImage = p.inlineData.data;
              break;
            }
          }
          if (foundImage) break;
        }

        if (!foundImage) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'GEMINI_NO_IMAGE_RETURNED',
          });
        }

        imageBase64 = foundImage;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[SketchRouter] Gemini generation failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'SKETCH_GENERATION_FAILED',
          cause: error,
        });
      }

      // Upload generated image to Supabase Storage
      const sketchId = crypto.randomUUID();
      const storagePath = `${ctx.userId}/sketches/${sketchId}.png`;
      const imageBuffer = Buffer.from(imageBase64, 'base64');

      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(storagePath, imageBuffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error('[SketchRouter] Upload failed:', uploadError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'SKETCH_UPLOAD_FAILED',
        });
      }

      const SUPABASE_URL = process.env.SUPABASE_URL;
      const imageUrl = SUPABASE_URL
        ? `${SUPABASE_URL}/storage/v1/object/public/${ATTACHMENT_BUCKET}/${storagePath}`
        : storagePath;

      return { sketchId, imageUrl, storagePath };
    }),

  /**
   * Pin a generated sketch to either a project vault or a sandbox note.
   *
   * vault: Inserts the sketch as a projectAttachment on the given project.
   * sandbox: Creates a note in the given sandbox with the sketch as a noteAttachment.
   */
  pin: protectedProcedure
    .input(pinSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.targetType === 'vault') {
        // Verify the project exists and belongs to this user
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.targetId), eq(projects.userId, ctx.userId)),
          columns: { id: true },
        });

        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'PROJECT_NOT_FOUND',
          });
        }

        // Derive a sane filename from the storage path
        const fileName = input.storagePath.split('/').pop() ?? 'sketch.png';

        await ctx.db.insert(projectAttachments).values({
          projectId: input.targetId,
          userId: ctx.userId,
          storagePath: input.storagePath,
          fileName,
          mimeType: 'image/png',
          sizeBytes: 0, // size not available at pin time; can be updated later
          order: 0,
        });

        return { success: true };
      }

      // targetType === 'sandbox'
      // Verify the sandbox exists and belongs to this user
      const sandbox = await ctx.db.query.sandboxes.findFirst({
        where: and(eq(sandboxes.id, input.targetId), eq(sandboxes.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!sandbox) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SANDBOX_NOT_FOUND',
        });
      }

      // Create a note inside the sandbox to hold this sketch
      const [note] = await ctx.db
        .insert(notes)
        .values({
          userId: ctx.userId,
          type: 'AI',
          sandboxId: input.targetId,
          content: '',
          updatedAt: new Date(),
        })
        .returning();

      if (!note) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create sketch note',
        });
      }

      const fileName = input.storagePath.split('/').pop() ?? 'sketch.png';

      await ctx.db.insert(noteAttachments).values({
        noteId: note.id,
        userId: ctx.userId,
        storagePath: input.storagePath,
        fileName,
        mimeType: 'image/png',
        sizeBytes: 0,
        order: 0,
      });

      return { success: true };
    }),
});

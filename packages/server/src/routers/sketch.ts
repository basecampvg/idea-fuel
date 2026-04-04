import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { SKETCH_TEMPLATE_TYPES } from '@forge/shared/constants';
import { getGeminiClient } from '../lib/gemini';
import { buildSketchPrompt } from '../lib/sketch-prompts';
import { supabase, ATTACHMENT_BUCKET } from '../lib/supabase';
import { notes, noteAttachments, projectAttachments, projects, sandboxes } from '../db/schema';

const generateSchema = z.object({
  templateType: z.enum(SKETCH_TEMPLATE_TYPES),
  description: z.string().min(1).max(500),
  features: z.array(z.string().max(120)).max(10).default([]),
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
      console.log('[SketchRouter] generate called', { templateType: input.templateType, description: input.description, features: input.features });

      if (!supabase) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Storage not configured',
        });
      }

      const gemini = getGeminiClient();

      // Enrich the user's description + features into a detailed subject prompt
      let enrichedDescription = input.description;
      if (input.features.length > 0) {
        try {
          const enrichResult = await gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a prompt engineer for an AI image generator. Given a product/concept description and a list of features, rewrite them into a single vivid, detailed description paragraph that an image generation model can use to create an accurate concept sketch. Focus on visual details — shape, materials, proportions, placement of features. Keep it under 200 words. Do NOT include any preamble or explanation — just output the description.

Description: ${input.description}

Features:
${input.features.map((f, i) => `${i + 1}. ${f}`).join('\n')}`,
          });
          const enriched = enrichResult.text?.trim();
          if (enriched) {
            enrichedDescription = enriched;
          }
        } catch (err) {
          // Enrichment is best-effort — fall back to raw description + features
          console.warn('[SketchRouter] Enrichment failed, using raw input:', err instanceof Error ? err.message : err);
          enrichedDescription = `${input.description}. Features: ${input.features.join('; ')}`;
        }
      }

      const prompt = buildSketchPrompt({
        templateType: input.templateType,
        description: enrichedDescription,
        annotations: input.annotations,
      });

      // Build content parts for image generation
      const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        { text: prompt },
      ];

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

        contents.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64,
          },
        });
      }

      // Call Gemini image generation (Nano Banana 2)
      let imageBase64: string;
      try {
        const response = await gemini.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents,
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        });

        // Find the image part in the response
        let foundImage: string | null = null;
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            foundImage = part.inlineData.data;
            break;
          }
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

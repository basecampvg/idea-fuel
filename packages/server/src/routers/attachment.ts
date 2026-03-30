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

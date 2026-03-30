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

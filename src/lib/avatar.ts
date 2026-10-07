import { supabaseUrl } from '@/lib/supabase/env';

export const AVATAR_BUCKET = 'avatars';

/** 頭像的公開網址；沒有頭像回傳 null。 */
export function avatarPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${new URL(supabaseUrl()).origin}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

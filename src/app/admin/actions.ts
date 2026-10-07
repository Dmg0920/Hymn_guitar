'use server';

import { refresh } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { isSongStatus } from '@/lib/songs';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { supabaseUrl } from '@/lib/supabase/env';
import {
  TITLE_MAX,
  parseOptionalText,
  parsePassword,
  parsePostUrl,
  parseUsername,
  type Parsed,
} from '@/lib/validation';

/** 只接受上傳到自己 Supabase storage 的縮圖。 */
function parseThumbnailUrl(raw: unknown): Parsed<string | null> {
  const value = String(raw ?? '').trim();
  if (value === '') return { ok: true, value: null };
  const prefix = `${new URL(supabaseUrl()).origin}/storage/v1/object/public/thumbnails/`;
  return value.startsWith(prefix)
    ? { ok: true, value }
    : { ok: false, error: '縮圖網址不正確，請重新上傳' };
}

export async function updateSong(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const songId = Number(formData.get('song_id'));
  if (!Number.isInteger(songId) || songId <= 0) return { error: '歌曲 ID 不正確' };

  const status = formData.get('status');
  if (!isSongStatus(status)) return { error: '狀態不正確' };
  const title = parseOptionalText(formData.get('title'), TITLE_MAX, '歌名');
  if (!title.ok) return { error: title.error };
  const postUrl = parsePostUrl(formData.get('post_url'));
  if (!postUrl.ok) return { error: postUrl.error };
  if (status === 'uploaded' && !postUrl.value) return { error: '標記為已上傳前請先貼上連結' };
  const thumbnailUrl = parseThumbnailUrl(formData.get('thumbnail_url'));
  if (!thumbnailUrl.ok) return { error: thumbnailUrl.error };

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from('songs')
    .select('book, uploaded_at')
    .eq('id', songId)
    .single();
  if (readError) return { error: '找不到這首歌' };
  if (current.book === 'other' && !title.value) return { error: '「其他」類的歌一定要有歌名' };

  const uploadedAt = status === 'uploaded' ? (current.uploaded_at ?? new Date().toISOString()) : null;

  const { error } = await supabase
    .from('songs')
    .update({
      status,
      title: title.value,
      post_url: postUrl.value,
      thumbnail_url: thumbnailUrl.value,
      uploaded_at: uploadedAt,
    })
    .eq('id', songId);
  if (error) {
    console.error('updateSong failed', error);
    return { error: error.code === '23505' ? '已經有同名的歌了' : '儲存失敗' };
  }

  refresh();
  return { success: '已儲存' };
}

export async function resetPassword(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const username = parseUsername(formData.get('username'));
  if (!username.ok) return { error: username.error };
  const password = parsePassword(formData.get('password'));
  if (!password.ok) return { error: password.error };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.value)
    .maybeSingle();
  if (!profile) return { error: '找不到這個帳號' };

  const { error } = await createAdminClient().auth.admin.updateUserById(profile.id, {
    password: password.value,
  });
  if (error) {
    console.error('resetPassword failed', error);
    return { error: '重設失敗' };
  }
  return { success: `已將 ${username.value} 的密碼重設，請私訊告訴對方` };
}

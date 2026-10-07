'use server';

import { refresh } from 'next/cache';
import { getViewer } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { createClient } from '@/lib/supabase/server';
import { MESSAGE_MAX, TITLE_MAX, parseOptionalText } from '@/lib/validation';

// request_song() 以 raise exception 回傳的代碼
const RPC_ERRORS: Record<string, string> = {
  not_authenticated: '請先登入',
  nickname_required: '請先設定暱稱',
  message_too_long: `留言最多 ${MESSAGE_MAX} 個字`,
  rate_limited: '今天點太多首了，明天再來吧',
  song_not_found: '找不到這首歌',
  title_too_long: `歌名最多 ${TITLE_MAX} 個字`,
  title_invalid: '請輸入歌名',
  song_required: '請選擇或輸入一首歌',
  already_uploaded: '這首已經上傳囉，直接去聽吧！',
  declined: '這首暫時不接受點播',
};

export async function submitRequest(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: RPC_ERRORS.not_authenticated };
  if (!viewer.nickname) return { error: RPC_ERRORS.nickname_required };

  const rawSongId = String(formData.get('song_id') ?? '');
  const songId = /^\d+$/.test(rawSongId) ? Number(rawSongId) : null;
  const title = parseOptionalText(formData.get('title'), TITLE_MAX, '歌名');
  if (!title.ok) return { error: title.error };
  const message = parseOptionalText(formData.get('message'), MESSAGE_MAX, '留言');
  if (!message.ok) return { error: message.error };
  if (songId === null && title.value === null) return { error: RPC_ERRORS.song_required };

  const supabase = await createClient();
  const { error } = await supabase.rpc('request_song', {
    p_song_id: songId,
    p_title: songId === null ? title.value : null,
    p_message: message.value,
  });
  if (error) {
    const known = RPC_ERRORS[error.message];
    if (!known) console.error('submitRequest failed', error);
    return { error: known ?? '點歌失敗，請稍後再試' };
  }

  refresh();
  return { success: '點歌成功！上傳後會出現在「我的點歌」。' };
}

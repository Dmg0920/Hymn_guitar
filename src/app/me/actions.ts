'use server';

import { refresh } from 'next/cache';
import { getViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function cancelRequest(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;

  const songId = Number(formData.get('song_id'));
  if (!Number.isInteger(songId) || songId <= 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from('requests')
    .delete()
    .eq('user_id', viewer.id)
    .eq('song_id', songId);
  if (error) throw new Error(`取消點歌失敗：${error.message}`);

  refresh();
}

/**
 * 把「已上傳、還沒看過」的點歌標成已讀。只動已上傳的歌：
 * 還在等待或練習中的歌若被標成已讀，上傳時就不會再通知。
 */
async function markUploadsSeen(songIds?: number[]): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;

  const supabase = await createClient();
  let unseen = supabase
    .from('requests')
    .select('song_id, songs!inner(status)')
    .eq('user_id', viewer.id)
    .is('seen_at', null)
    .eq('songs.status', 'uploaded');
  if (songIds) unseen = unseen.in('song_id', songIds);
  const { data, error: readError } = await unseen;
  if (readError) throw new Error(`讀取未讀通知失敗：${readError.message}`);
  const ids = (data ?? []).map((row) => row.song_id as number);
  if (ids.length === 0) return;

  const { error } = await supabase
    .from('requests')
    .update({ seen_at: new Date().toISOString() })
    .eq('user_id', viewer.id)
    .in('song_id', ids);
  if (error) throw new Error(`標示已讀失敗：${error.message}`);

  refresh();
}

export async function markUploadSeen(songId: number): Promise<void> {
  if (!Number.isInteger(songId) || songId <= 0) return;
  await markUploadsSeen([songId]);
}

export async function markAllUploadsSeen(): Promise<void> {
  await markUploadsSeen();
}

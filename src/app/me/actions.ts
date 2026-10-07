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

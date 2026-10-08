import type { createClient } from '@/lib/supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** 「你點的歌上傳了」：歌已上傳、而且使用者還沒看過（seen_at 為空）的點歌。 */
export function isUnseenUpload(request: { seen_at: string | null; status: string }): boolean {
  return request.status === 'uploaded' && request.seen_at === null;
}

/**
 * 導覽列用的未讀數。0008 還沒執行、或查詢失敗時退回 0：
 * 這個標記只是提醒，不該讓每一頁（Header 在 root layout）都跟著掛掉。
 */
export async function countUnseenUploads(supabase: Supabase, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('requests')
    .select('song_id, songs!inner(status)', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('seen_at', null)
    .eq('songs.status', 'uploaded');
  if (error) {
    console.error('countUnseenUploads failed', error);
    return 0;
  }
  return count ?? 0;
}

import { SONG_ETA_COLUMNS, type SongWithEta } from '@/lib/songs';
import type { createClient } from '@/lib/supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * 練習中的歌，依排隊順序（與 schedule.ts 的 compareQueue 相同）。
 * 讀取失敗時回傳 null，由呼叫端決定要不要降級（排程只是附加資訊，不該讓整頁掛掉）。
 */
export async function loadPracticingQueue(supabase: Supabase, limit = 50): Promise<SongWithEta[] | null> {
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_ETA_COLUMNS)
    .eq('status', 'practicing')
    .order('expected_at', { ascending: true, nullsFirst: false })
    .order('request_count', { ascending: false })
    .order('id', { ascending: true })
    .limit(limit);
  if (error) {
    console.error('loadPracticingQueue failed', error);
    return null;
  }
  return (data ?? []) as SongWithEta[];
}

import 'server-only';
import { SONG_COLUMNS, type Song } from '@/lib/songs';
import { createClient } from '@/lib/supabase/server';

/** 讀某人的最愛詩歌（依順序）。RLS 決定看不看得到：本人、管理員、或對方的檔案是公開的。 */
export async function loadFavoriteSongs(userId: string): Promise<Song[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('favorite_songs')
    .select(`position, songs!inner(${SONG_COLUMNS})`)
    .eq('user_id', userId)
    .order('position', { ascending: true });
  if (error) throw new Error(`讀取最愛詩歌失敗：${error.message}`);
  return ((data ?? []) as unknown as { songs: Song }[]).map((row) => row.songs);
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { SongThumbnail } from '@/components/SongThumbnail';
import { requireViewer } from '@/lib/auth';
import { SONG_COLUMNS, STATUS_LABELS, songHeading, songSubtitle, type Song } from '@/lib/songs';
import { createClient } from '@/lib/supabase/server';
import { cancelRequest } from './actions';

export const metadata: Metadata = { title: '我的點歌' };

type MyRequest = { message: string | null; created_at: string; songs: Song };

export default async function MyRequestsPage() {
  const viewer = await requireViewer('/me');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('requests')
    .select(`message, created_at, songs!inner(${SONG_COLUMNS})`)
    .eq('user_id', viewer.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`讀取點歌紀錄失敗：${error.message}`);
  const requests = (data ?? []) as unknown as MyRequest[];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">我的點歌</h1>
      {requests.length === 0 ? (
        <div className="card space-y-4 p-6 text-center">
          <p className="text-muted">你還沒有點過歌。</p>
          <Link href="/request" className="btn-primary">
            去點歌
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map(({ songs: song, message, created_at }) => (
            <li key={song.id} className="card flex items-center gap-3 p-3">
              <SongThumbnail song={song} className="w-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{songHeading(song)}</p>
                {songSubtitle(song) && <p className="line-clamp-1 text-sm text-muted">{songSubtitle(song)}</p>}
                {message && <p className="line-clamp-1 text-sm text-muted">「{message}」</p>}
                <p className="text-xs text-muted">
                  {new Date(created_at).toLocaleDateString('zh-TW')} 點播・共 {song.request_count} 人
                </p>
              </div>
              {song.status === 'uploaded' && song.post_url ? (
                <a href={song.post_url} target="_blank" rel="noopener noreferrer" className="btn-primary shrink-0 px-4 py-1.5">
                  去聽
                </a>
              ) : (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">
                    {STATUS_LABELS[song.status]}
                  </span>
                  <form action={cancelRequest}>
                    <input type="hidden" name="song_id" value={song.id} />
                    <button type="submit" className="text-xs text-muted hover:text-danger">
                      取消
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

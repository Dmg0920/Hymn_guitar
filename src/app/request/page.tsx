import type { Metadata } from 'next';
import { getViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { RequestForm } from './RequestForm';
import type { ViewerState } from './SongRequestPanel';

export const metadata: Metadata = { title: '點歌' };

export default async function RequestPage() {
  const viewer = await getViewer();
  const viewerState: ViewerState = !viewer ? 'anonymous' : viewer.nickname ? 'ready' : 'needsNickname';

  let requestedSongIds: number[] = [];
  if (viewer) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('requests').select('song_id').eq('user_id', viewer.id);
    if (error) throw new Error(`讀取點歌紀錄失敗：${error.message}`);
    requestedSongIds = (data ?? []).map((r) => r.song_id as number);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">點歌</h1>
        <p className="mt-1 text-sm text-muted">選詩歌本、補充本輸入號碼；其他詩歌用歌名搜尋。</p>
      </div>
      <RequestForm viewerState={viewerState} requestedSongIds={requestedSongIds} />
    </div>
  );
}

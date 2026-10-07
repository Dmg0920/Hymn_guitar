import type { Metadata } from 'next';
import { getViewer } from '@/lib/auth';
import type { SongBook } from '@/lib/songs';
import { createClient } from '@/lib/supabase/server';
import { RequestForm } from './RequestForm';
import type { ViewerState } from './SongRequestPanel';

export const metadata: Metadata = { title: '點歌' };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/** 首頁快速點歌會帶 ?book=hymn&code=384 過來；其餘值一律退回預設。 */
function parseInitialBook(raw: string): SongBook {
  return raw === 'supplement' || raw === 'other' ? raw : 'hymn';
}

export default async function RequestPage({ searchParams }: PageProps<'/request'>) {
  const params = await searchParams;
  const initialBook = parseInitialBook(first(params.book));
  const initialCode = initialBook === 'other' ? '' : first(params.code).slice(0, 8);

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
    <section className="wrap-narrow pb-8 pt-12 md:pt-20">
      <p className="eyebrow">Request</p>
      <h1 className="mt-4 font-serif text-5xl font-black tracking-wide md:text-7xl">點一首歌</h1>
      <p className="mt-5 max-w-sm text-balance text-muted">選詩歌本、補充本輸入號碼；其他詩歌用歌名搜尋。</p>

      <div className="mt-10 md:mt-12">
        <RequestForm
          viewerState={viewerState}
          requestedSongIds={requestedSongIds}
          initialBook={initialBook}
          initialCode={initialCode}
        />
      </div>
    </section>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Reveal } from '@/components/Reveal';
import { requireViewer } from '@/lib/auth';
import { SONG_COLUMNS, type Song } from '@/lib/songs';
import { createClient } from '@/lib/supabase/server';
import { RequestItem } from './RequestItem';

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
    <section className="wrap-medium pb-8 pt-12 md:pt-20">
      <p className="eyebrow">My requests</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <h1 className="font-serif text-5xl font-black tracking-wide md:text-7xl">我的點歌</h1>
        {requests.length > 0 && (
          <p className="pb-2 text-sm text-muted">
            共 <span className="numeral text-xl font-medium text-ink">{requests.length}</span> 首
          </p>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center gap-5 px-6 py-14 text-center">
          <p className="numeral text-6xl font-medium italic leading-none text-line-strong">♪</p>
          <p className="text-muted">你還沒有點過歌。</p>
          <Link href="/request" className="btn-primary">
            去點歌
          </Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-4 md:mt-12">
          {requests.map(({ songs: song, message, created_at }, i) => (
            <Reveal key={song.id} as="li" delay={Math.min(i, 5) * 70}>
              <RequestItem song={song} message={message} createdAt={created_at} />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

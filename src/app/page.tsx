import Link from 'next/link';
import { SongCard } from '@/components/SongCard';
import { SITE } from '@/lib/site';
import { LATEST_UPLOADS_LIMIT, SONG_COLUMNS, type Song } from '@/lib/songs';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_COLUMNS)
    .eq('status', 'uploaded')
    .order('uploaded_at', { ascending: false })
    .limit(LATEST_UPLOADS_LIMIT);
  if (error) throw new Error(`讀取最新上傳失敗：${error.message}`);
  const latest = (data ?? []) as Song[];

  return (
    <div className="space-y-10">
      <section className="card bg-accent-soft px-6 py-8 text-center">
        <h1 className="text-2xl font-bold">{SITE.name}</h1>
        <p className="mt-2 text-muted">{SITE.description}</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/request" className="btn-primary">
            我要點歌
          </Link>
          {SITE.instagramUrl && (
            <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              Instagram
            </a>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">最新上傳</h2>
        {latest.length === 0 ? (
          <p className="card p-6 text-center text-muted">還沒有上傳的詩歌，先來點一首吧！</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {latest.map((song, i) => (
              <SongCard key={song.id} song={song} isNew={i === 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import Link from 'next/link';
import { CountUp } from '@/components/CountUp';
import { EmptyLatest } from '@/components/EmptyLatest';
import { EmptySlot } from '@/components/EmptySlot';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { Marquee } from '@/components/Marquee';
import { PracticingQueue } from '@/components/PracticingQueue';
import { Reveal } from '@/components/Reveal';
import { SongCard } from '@/components/SongCard';
import { todayInTaipei } from '@/lib/format';
import { loadPracticingQueue } from '@/lib/queue';
import { LATEST_UPLOADS_LIMIT, SONG_COLUMNS, songHeading, type Song, type SongWithEta } from '@/lib/songs';
import { createClient } from '@/lib/supabase/server';

const PRACTICING_LIMIT = 8;
const FALLBACK_MARQUEE = ['點一首你想聽的詩歌', '詩歌本 1–780・附 1–6', '補充本', '也能用歌名搜尋', '上傳後第一時間找到它'];

type Stats = { uploaded: number; practicing: number; waiting: number };

/** 統計與跑馬燈只是點綴，失敗時不該讓整個首頁掛掉。 */
async function loadExtras(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ stats: Stats | null; practicing: SongWithEta[] }> {
  const head = { count: 'exact', head: true } as const;
  const [uploaded, practicing, waiting, practicingSongs] = await Promise.all([
    supabase.from('songs').select('id', head).eq('status', 'uploaded'),
    supabase.from('songs').select('id', head).eq('status', 'practicing'),
    supabase.from('songs').select('id', head).eq('status', 'open').gt('request_count', 0),
    loadPracticingQueue(supabase, PRACTICING_LIMIT),
  ]);

  const failures = [uploaded, practicing, waiting].filter((r) => r.error);
  failures.forEach((r) => console.error('HomePage: extras query failed', r.error));
  const failed = failures.length > 0 || [uploaded, practicing, waiting].some((r) => r.count === null);
  return {
    stats: failed ? null : { uploaded: uploaded.count ?? 0, practicing: practicing.count ?? 0, waiting: waiting.count ?? 0 },
    practicing: practicingSongs ?? [],
  };
}

export default async function HomePage() {
  const supabase = await createClient();
  const [latestResult, extras] = await Promise.all([
    supabase
      .from('songs')
      .select(SONG_COLUMNS)
      .eq('status', 'uploaded')
      .order('uploaded_at', { ascending: false })
      .limit(LATEST_UPLOADS_LIMIT),
    loadExtras(supabase),
  ]);
  if (latestResult.error) throw new Error(`讀取最新上傳失敗：${latestResult.error.message}`);
  const latest = (latestResult.data ?? []) as Song[];
  const emptySlots = Math.max(LATEST_UPLOADS_LIMIT - latest.length, 0);

  const marqueeItems =
    extras.practicing.length > 0
      ? ['練習中', ...extras.practicing.map((song) => `${songHeading(song)}${song.book !== 'other' && song.title ? ` ${song.title}` : ''}`)]
      : FALLBACK_MARQUEE;
  const hasStats = extras.stats && extras.stats.uploaded + extras.stats.practicing + extras.stats.waiting > 0;

  return (
    <>
      <Hero />

      {hasStats && extras.stats && <StatsStrip stats={extras.stats} />}

      <Marquee label={extras.practicing.length > 0 ? '正在練習的詩歌' : '網站簡介'} items={marqueeItems} />

      <section id="latest" aria-labelledby="latest-title" className="wrap scroll-mt-24 py-20 md:py-28">
        <Reveal className="mb-10 flex items-end justify-between gap-6 md:mb-14">
          <div>
            <p className="eyebrow">Latest uploads</p>
            <h2 id="latest-title" className="mt-4 font-serif text-4xl font-black tracking-wide md:text-6xl">
              最新上傳
            </h2>
          </div>
          {latest.length > 0 && (
            <Link href="/songs" className="group shrink-0 pb-2 text-sm font-medium text-accent underline-offset-4 hover:underline">
              全部已上傳
              <span aria-hidden="true" className="ml-1 inline-block transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-1">
                →
              </span>
            </Link>
          )}
        </Reveal>

        {latest.length === 0 ? (
          <Reveal>
            <EmptyLatest />
          </Reveal>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6 md:gap-y-12">
            {latest.map((song, i) => (
              <Reveal key={song.id} delay={i * 90} className={i === 0 ? 'col-span-2 md:row-span-2' : ''}>
                <SongCard song={song} isNew={i === 0} featured={i === 0} />
              </Reveal>
            ))}
            {/* 空位同時是點歌入口；手機只留第一個，桌機才補滿整齊的 2×2 */}
            {Array.from({ length: emptySlots }, (_, i) => (
              <Reveal key={`slot-${i}`} delay={(latest.length + i) * 90} className={i === 0 ? '' : 'hidden md:block'}>
                <EmptySlot />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {extras.practicing.length > 0 && (
        <PracticingQueue songs={extras.practicing} total={extras.stats?.practicing ?? extras.practicing.length} today={todayInTaipei()} />
      )}

      <HowItWorks />
    </>
  );
}

const STAT_LABELS: { key: keyof Stats; label: string }[] = [
  { key: 'uploaded', label: '已上傳' },
  { key: 'practicing', label: '練習中' },
  { key: 'waiting', label: '等待點播' },
];

function StatsStrip({ stats }: { stats: Stats }) {
  return (
    <dl className="wrap grid grid-cols-3 divide-x divide-line border-t border-line">
      {STAT_LABELS.map(({ key, label }) => (
        <div key={key} className="px-3 py-6 first:pl-0 last:pr-0 md:px-8 md:first:pl-0">
          <dt className="text-xs font-medium tracking-[0.2em] text-muted">{label}</dt>
          <dd className="mt-1 flex items-baseline gap-1.5">
            <CountUp value={stats[key]} className="numeral text-4xl font-medium leading-none md:text-6xl" />
            <span className="text-sm text-muted">首</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

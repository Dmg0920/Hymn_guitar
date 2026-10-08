import { describeEta, etaLabel } from '@/lib/schedule';
import { songHeading, songSubtitle, type SongWithEta } from '@/lib/songs';
import { Reveal } from './Reveal';

type Props = {
  songs: SongWithEta[];
  /** 練習中的總數；比 songs 多時，底下提示還有幾首。 */
  total: number;
  /** YYYY-MM-DD（台北），用來判斷預計日是否已過。 */
  today: string;
};

/** 練習中的排程：號碼板上一列一首，依排隊順序編號，旁邊是等待人數與預計上傳日。 */
export function PracticingQueue({ songs, total, today }: Props) {
  const hiddenCount = Math.max(total - songs.length, 0);

  return (
    <section id="practicing" aria-labelledby="practicing-title" className="wrap scroll-mt-24 pb-20 md:pb-28">
      <Reveal className="mb-10 md:mb-14">
        <p className="eyebrow">In rehearsal</p>
        <h2 id="practicing-title" className="mt-4 font-serif text-4xl font-black tracking-wide md:text-6xl">
          練習排程
        </h2>
        <p className="mt-4 max-w-md text-balance text-muted">
          正在練習、準備上傳的詩歌，照這個順序依序錄製。有填預計上傳日的先排，其餘點的人多的先。
        </p>
      </Reveal>

      <Reveal>
        <ol className="board divide-y divide-white/10 px-5 py-2 md:px-10">
          {songs.map((song, i) => {
            const eta = describeEta(song.expected_at, today);
            const subtitle = songSubtitle(song);
            return (
              <li key={song.id} className="flex items-center gap-4 py-5 md:gap-8 md:py-6">
                <span aria-hidden="true" className="numeral w-12 shrink-0 text-4xl font-medium italic leading-none text-brass md:w-20 md:text-6xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-xl font-bold leading-snug md:text-2xl">
                    <span className="sr-only">第 {i + 1} 位：</span>
                    {songHeading(song)}
                  </p>
                  {subtitle && <p className="mt-0.5 line-clamp-1 text-sm text-board-muted">{subtitle}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-medium md:text-base ${eta.kind === 'upcoming' ? 'text-brass' : 'text-board-muted'}`}
                  >
                    {etaLabel(eta)}
                  </p>
                  <p className="mt-0.5 text-xs text-board-muted">
                    <span className="tabular-nums">{song.request_count}</span> 人在等
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Reveal>

      {hiddenCount > 0 && <p className="mt-4 px-1 text-sm text-muted">還有 {hiddenCount} 首在練習中</p>}
    </section>
  );
}

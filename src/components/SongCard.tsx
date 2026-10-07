import { SongThumbnail } from '@/components/SongThumbnail';
import { formatDate } from '@/lib/format';
import { BOOK_LABELS, songHeading, songSubtitle, type Song } from '@/lib/songs';

type Props = {
  song: Song;
  isNew?: boolean;
  featured?: boolean;
  className?: string;
};

/** 已上傳詩歌的卡片，點了開 IG 貼文。 */
export function SongCard({ song, isNew = false, featured = false, className = '' }: Props) {
  const subtitle = songSubtitle(song);
  const uploadedOn = song.uploaded_at ? formatDate(song.uploaded_at, 'short') : null;

  return (
    <a
      href={song.post_url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${songHeading(song)}${subtitle ? `，${subtitle}` : ''}（在新分頁開啟貼文）`}
      className={`group/card flex flex-col gap-4 ${className}`}
    >
      <div className="relative">
        <SongThumbnail
          song={song}
          sizes={featured ? '(max-width: 768px) 100vw, 560px' : '(max-width: 768px) 50vw, 270px'}
          className="[--thumb-radius:1.25rem] shadow-xl shadow-black/10 ring-1 ring-line transition-shadow duration-500 group-hover/card:shadow-2xl group-hover/card:shadow-black/20"
        />
        {isNew && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-board/90 py-1.5 pl-3 pr-3.5 text-[0.6875rem] font-bold tracking-[0.2em] text-board-ink backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-[ping-soft_2s_ease-out_infinite] rounded-full bg-brass" />
              <span className="relative size-2 rounded-full bg-brass" />
            </span>
            NEW
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 z-10 grid size-10 translate-y-1 place-items-center rounded-full bg-paper/90 text-lg text-ink opacity-0 backdrop-blur transition duration-500 ease-[var(--ease-out)] group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-visible/card:translate-y-0 group-focus-visible/card:opacity-100"
        >
          ↗
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <CardHeading song={song} subtitle={subtitle} featured={featured} />
        </div>
        {uploadedOn && (
          <time dateTime={song.uploaded_at ?? undefined} className="shrink-0 pb-0.5 text-xs tabular-nums text-muted">
            {uploadedOn} 上傳
          </time>
        )}
      </div>
    </a>
  );
}

/**
 * 卡片文字。有縮圖時用大號碼辨識；沒縮圖時封面已經是大號碼，
 * 下方就改成「詩歌本 384」小標 + 歌名／分類，避免同一個數字出現兩次。
 */
function CardHeading({ song, subtitle, featured }: { song: Song; subtitle: string | null; featured: boolean }) {
  const hover = 'transition-colors duration-300 group-hover/card:text-accent';

  if (song.book === 'other') {
    return (
      <p className={`font-serif font-bold leading-snug ${featured ? 'text-3xl' : 'text-xl'} ${hover}`}>{song.title}</p>
    );
  }

  if (!song.thumbnail_url) {
    return (
      <>
        <p className="text-xs font-medium tracking-[0.2em] text-muted">{songHeading(song)}</p>
        {subtitle && (
          <p className={`mt-1.5 line-clamp-2 font-serif font-bold leading-snug ${featured ? 'text-3xl' : 'text-lg'} ${hover}`}>
            {subtitle}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <p className="text-xs font-medium tracking-[0.2em] text-muted">{BOOK_LABELS[song.book]}</p>
      <p className={`numeral mt-1 font-medium leading-none ${featured ? 'text-5xl md:text-6xl' : 'text-3xl'} ${hover}`}>
        {song.code}
      </p>
      {subtitle && <p className="mt-2.5 line-clamp-1 text-sm text-muted">{subtitle}</p>}
    </>
  );
}

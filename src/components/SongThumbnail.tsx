import Image from 'next/image';
import { BOOK_LABELS, songHeading, type Song, type SongBook } from '@/lib/songs';

type Props = {
  song: Pick<Song, 'book' | 'code' | 'title' | 'thumbnail_url'>;
  className?: string;
  sizes?: string;
};

const COVER_TONE: Record<SongBook, string> = {
  hymn: 'bg-board text-board-ink',
  supplement: 'bg-accent text-accent-ink',
  other: 'bg-accent-soft text-accent',
};

const STRING_LINES = [18, 34, 50, 66, 82];

/** 縮圖（正方形，跟 IG 一樣）；沒有縮圖時用「號碼板」風格的封面。尺寸全用 container query，任何大小都成比例。 */
export function SongThumbnail({ song, className = '', sizes = '(max-width: 640px) 50vw, 280px' }: Props) {
  return (
    // 圓角由 --thumb-radius 決定（預設 0.75rem），呼叫端用 [--thumb-radius:...] 覆寫，
    // 不要同時傳兩個 rounded-*（同屬性衝突時 Tailwind 是依字母序決定誰贏，不可預期）
    <div
      className={`@container relative aspect-square overflow-hidden rounded-[var(--thumb-radius,0.75rem)] bg-accent-soft ring-1 ring-line ${className}`}
    >
      {song.thumbnail_url ? (
        <Image
          src={song.thumbnail_url}
          alt={songHeading(song)}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover/card:scale-105"
        />
      ) : (
        <Cover song={song} />
      )}
    </div>
  );
}

function Cover({ song }: { song: Pick<Song, 'book' | 'code' | 'title'> }) {
  const isOther = song.book === 'other';
  const code = song.code ?? '';
  const numeralSize = code.length <= 2 ? 'text-[44cqw]' : code.length === 3 ? 'text-[34cqw]' : 'text-[26cqw]';

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center transition-transform duration-700 ease-[var(--ease-out)] group-hover/card:scale-105 ${COVER_TONE[song.book]}`}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full opacity-[0.16]">
        {STRING_LINES.map((y, i) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" strokeWidth={0.6 + i * 0.25} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <span className="absolute left-[9%] top-[8%] hidden text-[6cqw] font-medium tracking-[0.22em] opacity-70 @min-[7rem]:block">
        {BOOK_LABELS[song.book]}
      </span>
      {isOther ? (
        <>
          <span className="numeral relative text-[40cqw] font-medium italic leading-none">♪</span>
          {song.title && (
            <span className="relative mt-[3cqw] line-clamp-2 hidden max-w-[80%] text-center font-serif text-[7cqw] font-bold leading-snug @min-[7rem]:block">
              {song.title}
            </span>
          )}
        </>
      ) : (
        <span className={`numeral relative font-medium leading-none ${numeralSize}`}>{code}</span>
      )}
    </div>
  );
}

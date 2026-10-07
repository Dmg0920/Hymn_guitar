import Image from 'next/image';
import { BOOK_LABELS, type Song } from '@/lib/songs';

type Props = {
  song: Pick<Song, 'book' | 'code' | 'title' | 'thumbnail_url'>;
  className?: string;
};

/** 縮圖（正方形，跟 IG 一樣）；沒有縮圖時顯示號碼。 */
export function SongThumbnail({ song, className = '' }: Props) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-xl bg-accent-soft ${className}`}>
      {song.thumbnail_url ? (
        <Image
          src={song.thumbnail_url}
          alt={song.title ?? ''}
          fill
          sizes="(max-width: 640px) 50vw, 240px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center p-2 text-center text-accent">
          <span className="text-xs">{BOOK_LABELS[song.book]}</span>
          <span className="line-clamp-2 text-xl font-bold">
            {song.book === 'other' ? '♪' : song.code}
          </span>
        </div>
      )}
    </div>
  );
}

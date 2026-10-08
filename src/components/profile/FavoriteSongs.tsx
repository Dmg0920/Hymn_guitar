import { SongThumbnail } from '@/components/SongThumbnail';
import { songHeading, songSubtitle, type Song } from '@/lib/songs';

/** 最愛詩歌清單（已依順序排好）。已上傳的歌可以直接點進去聽。 */
export function FavoriteSongs({ songs }: { songs: Song[] }) {
  return (
    <ol className="space-y-3">
      {songs.map((song, i) => {
        const subtitle = songSubtitle(song);
        const body = (
          <>
            <span aria-hidden="true" className="numeral w-6 shrink-0 text-center text-2xl font-medium italic text-line-strong">
              {i + 1}
            </span>
            <SongThumbnail song={song} className="w-14 shrink-0" />
            <div className="min-w-0">
              <p className="font-serif text-lg font-bold leading-snug">{songHeading(song)}</p>
              {subtitle && <p className="line-clamp-1 text-sm text-muted">{subtitle}</p>}
            </div>
            {song.status === 'uploaded' && song.post_url && (
              <span className="ml-auto shrink-0 text-sm font-medium text-accent">
                去聽 <span aria-hidden="true">↗</span>
              </span>
            )}
          </>
        );
        const className = 'card group/card flex items-center gap-3 p-3 transition-colors duration-300';
        return (
          <li key={song.id}>
            {song.status === 'uploaded' && song.post_url ? (
              <a href={song.post_url} target="_blank" rel="noopener noreferrer" className={`${className} hover:border-accent`}>
                {body}
              </a>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

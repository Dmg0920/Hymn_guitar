import { SongThumbnail } from '@/components/SongThumbnail';
import { StatusTrack } from '@/components/StatusTrack';
import { formatDate } from '@/lib/format';
import { songHeading, songSubtitle, type Song } from '@/lib/songs';
import { cancelRequest } from './actions';

export function RequestItem({ song, message, createdAt }: { song: Song; message: string | null; createdAt: string }) {
  const subtitle = songSubtitle(song);
  const canListen = song.status === 'uploaded' && song.post_url;

  return (
    <div className="card flex flex-col gap-5 p-4 transition-colors duration-300 hover:border-line-strong md:flex-row md:items-center md:gap-6 md:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <SongThumbnail song={song} className="w-20 shrink-0 md:w-24" />
        <div className="min-w-0">
          <p className="font-serif text-xl font-bold leading-snug">{songHeading(song)}</p>
          {subtitle && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{subtitle}</p>}
          {message && <p className="mt-1 line-clamp-1 text-sm text-muted">「{message}」</p>}
          <p className="mt-2 text-xs text-muted">
            {formatDate(createdAt)} 點播・共 <span className="tabular-nums">{song.request_count}</span> 人
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 md:w-60">
        <StatusTrack status={song.status} />
        {canListen ? (
          <a href={song.post_url!} target="_blank" rel="noopener noreferrer" className="btn-primary group min-h-11 w-full">
            去聽
            <span aria-hidden="true" className="transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:-translate-y-0.5">
              ↗
            </span>
          </a>
        ) : (
          <form action={cancelRequest} className="text-right">
            <input type="hidden" name="song_id" value={song.id} />
            <button
              type="submit"
              aria-label={`取消這首：${songHeading(song)}`}
              className="min-h-9 text-xs text-muted underline-offset-4 transition-colors hover:text-danger hover:underline"
            >
              取消這首
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

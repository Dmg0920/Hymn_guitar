import { SongThumbnail } from '@/components/SongThumbnail';
import { StatusTrack } from '@/components/StatusTrack';
import { formatDate } from '@/lib/format';
import { etaLabel, type EtaInfo } from '@/lib/schedule';
import { songHeading, songSubtitle, type Song } from '@/lib/songs';
import { cancelRequest } from './actions';
import { ListenLink } from './ListenLink';

/** 練習中的歌在排隊順序裡的位置（沒有排程資料時不傳）。 */
export type QueuePlace = { rank: number; total: number; eta: EtaInfo };

type Props = {
  song: Song;
  message: string | null;
  createdAt: string;
  isUnseen?: boolean;
  queuePlace?: QueuePlace;
};

export function RequestItem({ song, message, createdAt, isUnseen = false, queuePlace }: Props) {
  const subtitle = songSubtitle(song);
  const canListen = song.status === 'uploaded' && song.post_url;

  return (
    <div
      className={`card flex flex-col gap-5 p-4 transition-colors duration-300 md:flex-row md:items-center md:gap-6 md:p-5 ${
        isUnseen ? 'border-accent' : 'hover:border-line-strong'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <SongThumbnail song={song} className="w-20 shrink-0 md:w-24" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-serif text-xl font-bold leading-snug">
            {songHeading(song)}
            {isUnseen && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 font-sans text-[0.6875rem] font-bold tracking-[0.18em] text-accent-ink">
                新上傳
              </span>
            )}
          </p>
          {subtitle && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{subtitle}</p>}
          {message && <p className="mt-1 line-clamp-1 text-sm text-muted">「{message}」</p>}
          <p className="mt-2 text-xs text-muted">
            {formatDate(createdAt)} 點播・共 <span className="tabular-nums">{song.request_count}</span> 人
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 md:w-60">
        <StatusTrack status={song.status} />
        {queuePlace && (
          <p className="text-center text-xs text-muted">
            排在第 <span className="numeral text-base font-medium text-ink">{queuePlace.rank}</span> / {queuePlace.total} 位・
            {etaLabel(queuePlace.eta)}
          </p>
        )}
        {canListen ? (
          <ListenLink songId={song.id} postUrl={song.post_url!} isUnseen={isUnseen} />
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

import { SongThumbnail } from '@/components/SongThumbnail';
import { songHeading, songSubtitle, type Song } from '@/lib/songs';

type Props = {
  song: Song;
  isNew?: boolean;
};

/** 已上傳詩歌的卡片，點了開 IG 貼文。 */
export function SongCard({ song, isNew = false }: Props) {
  const subtitle = songSubtitle(song);

  return (
    <a
      href={song.post_url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="card group relative block p-2 transition hover:border-accent"
    >
      {isNew && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink shadow">
          NEW
        </span>
      )}
      <SongThumbnail song={song} />
      <div className="px-1 pb-1 pt-2">
        <p className="font-medium group-hover:text-accent">{songHeading(song)}</p>
        {subtitle && <p className="line-clamp-1 text-sm text-muted">{subtitle}</p>}
      </div>
    </a>
  );
}

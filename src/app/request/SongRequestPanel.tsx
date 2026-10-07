'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { SongThumbnail } from '@/components/SongThumbnail';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { STATUS_LABELS, songHeading, songSubtitle, type Song } from '@/lib/songs';
import { MESSAGE_MAX } from '@/lib/validation';
import { submitRequest } from './actions';

export type ViewerState = 'anonymous' | 'needsNickname' | 'ready';

type Target = { song: Song } | { newTitle: string };

type Props = {
  target: Target;
  viewerState: ViewerState;
  alreadyRequested: boolean;
};

export function SongRequestPanel({ target, viewerState, alreadyRequested }: Props) {
  if ('song' in target && target.song.status === 'uploaded') {
    return <UploadedSong song={target.song} />;
  }

  const song = 'song' in target ? target.song : null;
  const heading = 'song' in target ? songHeading(target.song) : target.newTitle;
  const subtitle = 'song' in target ? songSubtitle(target.song) : '新歌，目前沒人點過';

  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-start gap-3">
        {song && <SongThumbnail song={song} className="w-16 shrink-0" />}
        <div className="min-w-0">
          <p className="text-lg font-semibold">{heading}</p>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          {song && (
            <p className="mt-1 text-sm">
              {song.request_count > 0 ? `已有 ${song.request_count} 人點播` : '還沒有人點過'}
              {song.status === 'practicing' && <span className="ml-2 text-accent">・{STATUS_LABELS.practicing}</span>}
            </p>
          )}
        </div>
      </div>

      {song?.status === 'declined' ? (
        <p className="text-sm text-muted">這首暫時不接受點播。</p>
      ) : (
        <RequestAction
          target={target}
          viewerState={viewerState}
          alreadyRequested={alreadyRequested}
        />
      )}
    </div>
  );
}

function RequestAction({ target, viewerState, alreadyRequested }: Props) {
  const [state, action, pending] = useActionState(submitRequest, INITIAL_FORM_STATE);

  if (viewerState === 'anonymous') {
    return (
      <Link href="/login?next=/request" className="btn-primary w-full">
        登入後點歌
      </Link>
    );
  }
  if (viewerState === 'needsNickname') {
    return (
      <Link href="/onboarding?next=/request" className="btn-primary w-full">
        先設定暱稱
      </Link>
    );
  }
  if (state.success) {
    return (
      <div className="space-y-3">
        <FormMessage state={state} />
        <Link href="/me" className="btn-ghost w-full">
          查看我的點歌
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {'song' in target ? (
        <input type="hidden" name="song_id" value={target.song.id} />
      ) : (
        <input type="hidden" name="title" value={target.newTitle} />
      )}
      <textarea
        name="message"
        maxLength={MESSAGE_MAX}
        rows={2}
        placeholder="想說的話（選填），例如：想要 capo 2 的版本"
        className="input resize-none"
      />
      {alreadyRequested && <p className="text-sm text-muted">你已經點過這首，再送出會更新留言。</p>}
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? '送出中…' : alreadyRequested ? '更新留言' : '點這首'}
      </button>
    </form>
  );
}

function UploadedSong({ song }: { song: Song }) {
  const subtitle = songSubtitle(song);
  return (
    <a
      href={song.post_url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="card flex items-center gap-4 p-4 transition hover:border-accent"
    >
      <SongThumbnail song={song} className="w-24 shrink-0" />
      <div>
        <p className="text-lg font-semibold">{songHeading(song)}</p>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        <p className="mt-2 text-sm font-medium text-accent">已上傳，點我去聽 →</p>
      </div>
    </a>
  );
}

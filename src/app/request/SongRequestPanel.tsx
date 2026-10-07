'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { SongThumbnail } from '@/components/SongThumbnail';
import { Spinner } from '@/components/Spinner';
import { SuccessMark } from '@/components/SuccessMark';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { BOOK_LABELS, STATUS_LABELS, songSubtitle, type Song } from '@/lib/songs';
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
  const subtitle = song ? songSubtitle(song) : '新歌，目前沒人點過';

  return (
    <div className="card animate-rise space-y-6 p-5 shadow-xl shadow-black/5 md:p-6">
      <div className="flex items-center gap-4 md:gap-5">
        {song?.thumbnail_url && <SongThumbnail song={song} className="w-24 shrink-0 md:w-28" />}
        <div className="min-w-0">
          <SongTitle target={target} />
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          {song && <Popularity song={song} />}
        </div>
      </div>

      {song?.status === 'declined' ? (
        <p className="rounded-xl bg-paper-2 px-4 py-3 text-sm text-muted">這首暫時不接受點播。</p>
      ) : (
        <RequestAction target={target} viewerState={viewerState} alreadyRequested={alreadyRequested} />
      )}
    </div>
  );
}

function SongTitle({ target }: { target: Target }) {
  if ('newTitle' in target) {
    return <p className="font-serif text-3xl font-black leading-tight">{target.newTitle}</p>;
  }
  const { song } = target;
  if (song.book === 'other') {
    return <p className="font-serif text-3xl font-black leading-tight">{song.title ?? '（未命名）'}</p>;
  }
  return (
    <>
      <p className="text-xs font-medium tracking-[0.2em] text-muted">{BOOK_LABELS[song.book]}</p>
      <p className="numeral mt-1 text-6xl font-medium leading-none md:text-7xl">{song.code}</p>
    </>
  );
}

function Popularity({ song }: { song: Song }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {song.request_count > 0 ? (
        <span>
          已有 <span className="numeral text-lg font-medium text-accent">{song.request_count}</span> 人點播
        </span>
      ) : (
        <span className="text-muted">還沒有人點過，你是第一個！</span>
      )}
      {song.status === 'practicing' && (
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
          {STATUS_LABELS.practicing}
        </span>
      )}
    </p>
  );
}

function RequestAction({ target, viewerState, alreadyRequested }: Props) {
  const [state, action, pending] = useActionState(submitRequest, INITIAL_FORM_STATE);
  const [message, setMessage] = useState('');

  if (viewerState === 'anonymous') {
    return (
      <Link href="/login?next=/request" className="btn-primary min-h-14 w-full text-base">
        登入後點歌
      </Link>
    );
  }
  if (viewerState === 'needsNickname') {
    return (
      <Link href="/onboarding?next=/request" className="btn-primary min-h-14 w-full text-base">
        先設定暱稱
      </Link>
    );
  }
  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <SuccessMark />
        <FormMessage state={state} />
        <Link href="/me" className="btn-ghost w-full">
          查看我的點歌
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {'song' in target ? (
        <input type="hidden" name="song_id" value={target.song.id} />
      ) : (
        <input type="hidden" name="title" value={target.newTitle} />
      )}
      <div className="relative">
        <label htmlFor="request-message" className="label">
          想說的話（選填）
        </label>
        <textarea
          id="request-message"
          name="message"
          maxLength={MESSAGE_MAX}
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="例如：想要 capo 2 的版本"
          className="input resize-none"
        />
        {message.length > 0 && (
          <span className="absolute bottom-3 right-3 text-xs tabular-nums text-muted">
            {message.length}/{MESSAGE_MAX}
          </span>
        )}
      </div>
      {alreadyRequested && <p className="text-sm text-muted">你已經點過這首，再送出會更新留言。</p>}
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-primary group min-h-14 w-full text-base">
        {pending ? (
          <>
            <Spinner />
            送出中…
          </>
        ) : (
          <>
            {alreadyRequested ? '更新留言' : '點這首'}
            <span aria-hidden="true" className="transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-1.5">
              →
            </span>
          </>
        )}
      </button>
    </form>
  );
}

function UploadedSong({ song }: { song: Song }) {
  const subtitle = songSubtitle(song);
  const isOther = song.book === 'other';
  return (
    <a
      href={song.post_url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="card group/card animate-rise flex items-center gap-5 p-5 shadow-xl shadow-black/5 transition-colors duration-300 hover:border-accent md:p-6"
    >
      {song.thumbnail_url && <SongThumbnail song={song} className="w-28 shrink-0 md:w-32" />}
      <div className="min-w-0">
        {isOther ? (
          <p className="font-serif text-2xl font-black leading-tight">{song.title}</p>
        ) : (
          <>
            <p className="text-xs font-medium tracking-[0.2em] text-muted">{BOOK_LABELS[song.book]}</p>
            <p className="numeral mt-1 text-5xl font-medium leading-none">{song.code}</p>
          </>
        )}
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        <p className="mt-4 inline-flex items-center gap-2 font-medium text-accent">
          已上傳，點我去聽
          <span aria-hidden="true" className="transition-transform duration-500 ease-[var(--ease-out)] group-hover/card:translate-x-1.5">
            →
          </span>
        </p>
      </div>
    </a>
  );
}

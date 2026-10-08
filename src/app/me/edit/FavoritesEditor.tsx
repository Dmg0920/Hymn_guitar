'use client';

import { useId, useState } from 'react';
import { useSongByCode, useTitleSearch } from '@/app/request/useSongLookup';
import { BOOK_LABELS, songHeading, songSubtitle, type Song } from '@/lib/songs';
import { FAVORITES_MAX } from '@/lib/validation';

type Source = 'hymn' | 'supplement' | 'title';

type Props = { songs: Song[]; onChange: (songs: Song[]) => void };

const iconButton =
  'grid size-10 place-items-center rounded-full border border-field text-sm transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-field disabled:hover:text-inherit';

/** 挑最多 5 首最愛的詩歌：用號碼或歌名找，可以調整順序。 */
export function FavoritesEditor({ songs, onChange }: Props) {
  const move = (from: number, to: number) => {
    const next = [...songs];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };
  const full = songs.length >= FAVORITES_MAX;

  return (
    <div className="space-y-4">
      {songs.length > 0 && (
        <ol className="space-y-2">
          {songs.map((song, i) => {
            const subtitle = songSubtitle(song);
            return (
              <li key={song.id} className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-3 py-2">
                <span aria-hidden="true" className="numeral w-5 shrink-0 text-center text-xl italic text-line-strong">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif font-bold">{songHeading(song)}</p>
                  {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
                </div>
                <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`把 ${songHeading(song)} 往前移`} className={iconButton}>
                  ↑
                </button>
                <button type="button" disabled={i === songs.length - 1} onClick={() => move(i, i + 1)} aria-label={`把 ${songHeading(song)} 往後移`} className={iconButton}>
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange(songs.filter((s) => s.id !== song.id))}
                  aria-label={`移除 ${songHeading(song)}`}
                  className={`${iconButton} hover:border-danger hover:text-danger`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {full ? (
        <p className="text-sm text-muted">已經選滿 {FAVORITES_MAX} 首，要換的話先移除一首。</p>
      ) : (
        <SongPicker chosen={songs} onPick={(song) => onChange([...songs, song])} />
      )}
    </div>
  );
}

function SongPicker({ chosen, onPick }: { chosen: Song[]; onPick: (song: Song) => void }) {
  const id = useId();
  const [source, setSource] = useState<Source>('hymn');
  const [input, setInput] = useState('');
  const chosenIds = new Set(chosen.map((s) => s.id));

  const code = useSongByCode(source === 'title' ? 'hymn' : source, source === 'title' ? '' : input);
  const title = useTitleSearch(source === 'title' ? input : '');

  const pick = (song: Song) => {
    onPick(song);
    setInput('');
  };

  const candidates: Song[] =
    source === 'title' ? (title.kind === 'done' ? title.results : []) : code.kind === 'found' ? [code.song] : [];
  const status =
    source === 'title'
      ? title.kind === 'loading'
        ? '搜尋中…'
        : title.kind === 'error'
          ? '搜尋失敗，請稍後再試'
          : title.kind === 'done' && title.results.length === 0
            ? '找不到這首歌'
            : null
      : code.kind === 'invalid'
        ? code.message
        : code.kind === 'loading'
          ? '查詢中…'
          : code.kind === 'error'
            ? '查詢失敗，請稍後再試'
            : code.kind === 'notFound'
              ? '沒有這個號碼'
              : null;

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-line-strong p-3">
      <div className="flex gap-2">
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value as Source);
            setInput('');
          }}
          aria-label="用什麼找歌"
          className="input w-auto shrink-0"
        >
          <option value="hymn">{BOOK_LABELS.hymn}號碼</option>
          <option value="supplement">{BOOK_LABELS.supplement}號碼</option>
          <option value="title">歌名</option>
        </select>
        <input
          id={`${id}-input`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          // 在表單裡按 Enter 不應該送出整份檔案
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          inputMode={source === 'title' ? 'text' : 'numeric'}
          placeholder={source === 'title' ? '輸入歌名' : '輸入號碼，例如 384'}
          aria-label="搜尋最愛的詩歌"
          className="input min-w-0 flex-1"
        />
      </div>
      <div aria-live="polite">
        {status && <p className="px-1 text-sm text-muted">{status}</p>}
        {candidates.length > 0 && (
          <ul className="space-y-2">
            {candidates.map((song) => {
              const added = chosenIds.has(song.id);
              const subtitle = songSubtitle(song);
              return (
                <li key={song.id} className="flex items-center gap-3 rounded-xl bg-paper-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif font-bold">{songHeading(song)}</p>
                    {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => pick(song)}
                    className="btn-ghost min-h-10 px-4 text-sm"
                    aria-label={added ? `${songHeading(song)} 已加入` : `加入 ${songHeading(song)}`}
                  >
                    {added ? '已加入' : '加入'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

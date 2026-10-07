'use client';

import { useState } from 'react';
import { BOOK_LABELS, songHeading, songSubtitle, type Song, type SongBook } from '@/lib/songs';
import { TITLE_MAX } from '@/lib/validation';
import { SongRequestPanel, type ViewerState } from './SongRequestPanel';
import { useSongByCode, useTitleSearch } from './useSongLookup';

const TABS: SongBook[] = ['hymn', 'supplement', 'other'];

type Props = {
  viewerState: ViewerState;
  requestedSongIds: number[];
};

export function RequestForm({ viewerState, requestedSongIds }: Props) {
  const [book, setBook] = useState<SongBook>('hymn');
  const requested = new Set(requestedSongIds);

  return (
    <div className="space-y-4">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-full border border-line bg-card p-1 text-sm">
        {TABS.map((b) => (
          <button
            key={b}
            role="tab"
            type="button"
            aria-selected={book === b}
            onClick={() => setBook(b)}
            className={`rounded-full py-2 ${book === b ? 'bg-accent font-medium text-accent-ink' : 'text-muted'}`}
          >
            {BOOK_LABELS[b]}
          </button>
        ))}
      </div>

      {book === 'other' ? (
        <TitleSearchSection viewerState={viewerState} requested={requested} />
      ) : (
        // key：切換詩歌本 / 補充本時清空輸入
        <CodeSection key={book} book={book} viewerState={viewerState} requested={requested} />
      )}
    </div>
  );
}

type SectionProps = { viewerState: ViewerState; requested: Set<number> };

function CodeSection({ book, viewerState, requested }: SectionProps & { book: 'hymn' | 'supplement' }) {
  const [input, setInput] = useState('');
  const lookup = useSongByCode(book, input);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="label">{BOOK_LABELS[book]}第幾首？</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode={book === 'supplement' ? 'numeric' : 'text'}
          placeholder={book === 'hymn' ? '例如 384 或 附1' : '例如 101'}
          className="input text-lg"
          autoFocus
        />
      </label>

      {lookup.kind === 'invalid' && <p className="text-sm text-danger">{lookup.message}</p>}
      {lookup.kind === 'loading' && <p className="text-sm text-muted">查詢中…</p>}
      {lookup.kind === 'error' && <p className="text-sm text-danger">查詢失敗，請稍後再試</p>}
      {lookup.kind === 'notFound' && (
        <p className="text-sm text-danger">
          {book === 'hymn' ? '詩歌本沒有這一首（1–780、附1–6）' : '補充本沒有這一首'}
        </p>
      )}
      {lookup.kind === 'found' && (
        <SongRequestPanel
          key={lookup.song.id}
          target={{ song: lookup.song }}
          viewerState={viewerState}
          alreadyRequested={requested.has(lookup.song.id)}
        />
      )}
    </div>
  );
}

function TitleSearchSection({ viewerState, requested }: SectionProps) {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<Song | null>(null);
  const [isNewTitle, setIsNewTitle] = useState(false);
  const search = useTitleSearch(input);
  const query = input.trim();

  const onChange = (value: string) => {
    setInput(value);
    setSelected(null);
    setIsNewTitle(false);
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="label">歌名</span>
        <input
          value={input}
          onChange={(e) => onChange(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="輸入歌名或其中幾個字"
          className="input text-lg"
          autoFocus
        />
      </label>

      {selected ? (
        <SongRequestPanel
          key={selected.id}
          target={{ song: selected }}
          viewerState={viewerState}
          alreadyRequested={requested.has(selected.id)}
        />
      ) : isNewTitle ? (
        <SongRequestPanel key={query} target={{ newTitle: query }} viewerState={viewerState} alreadyRequested={false} />
      ) : (
        <>
          {search.kind === 'loading' && <p className="text-sm text-muted">搜尋中…</p>}
          {search.kind === 'error' && <p className="text-sm text-danger">搜尋失敗，請稍後再試</p>}
          {search.kind === 'done' && (
            <div className="space-y-2">
              {search.results.length > 0 && <p className="text-sm text-muted">是這些嗎？</p>}
              {search.results.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => setSelected(song)}
                  className="card flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:border-accent"
                >
                  <span>
                    <span className="font-medium">{songHeading(song)}</span>
                    {songSubtitle(song) && <span className="ml-2 text-sm text-muted">{songSubtitle(song)}</span>}
                  </span>
                  {song.status === 'uploaded' && <span className="shrink-0 text-xs text-accent">已上傳</span>}
                </button>
              ))}
              <button type="button" onClick={() => setIsNewTitle(true)} className="btn-ghost w-full">
                {search.results.length > 0 ? `都不是，點「${query}」` : `點「${query}」`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

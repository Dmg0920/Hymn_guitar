'use client';

import { useId, useState } from 'react';
import { BoardCodeInput } from '@/components/BoardCodeInput';
import { Segmented } from '@/components/Segmented';
import { BOOK_LABELS, songHeading, songSubtitle, type Song, type SongBook } from '@/lib/songs';
import { TITLE_MAX } from '@/lib/validation';
import { SongRequestPanel, type ViewerState } from './SongRequestPanel';
import { useSongByCode, useTitleSearch } from './useSongLookup';

const TABS = (['hymn', 'supplement', 'other'] as const).map((value) => ({ value, label: BOOK_LABELS[value] }));
const APPENDIX_PREFIX = '附';

type Props = {
  viewerState: ViewerState;
  requestedSongIds: number[];
  initialBook: SongBook;
  initialCode: string;
};

export function RequestForm({ viewerState, requestedSongIds, initialBook, initialCode }: Props) {
  const idPrefix = useId();
  const [book, setBook] = useState<SongBook>(initialBook);
  // 頁面一載入、或用滑鼠 / 觸控切換時，輸入框自動取得焦點；用方向鍵切換時焦點要留在 tab 上
  const [shouldAutoFocus, setShouldAutoFocus] = useState(true);
  const requested = new Set(requestedSongIds);

  return (
    <div className="space-y-6">
      <Segmented
        options={TABS}
        value={book}
        onChange={(next, source) => {
          setBook(next);
          setShouldAutoFocus(source !== 'keyboard');
        }}
        idPrefix={idPrefix}
        label="選擇詩歌來源"
      />

      <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${book}`} className="space-y-6">
        {book === 'other' ? (
          <TitleSearchSection viewerState={viewerState} requested={requested} autoFocus={shouldAutoFocus} />
        ) : (
          // key：切換詩歌本 / 補充本時清空輸入
          <CodeSection
            key={book}
            book={book}
            initialCode={book === initialBook ? initialCode : ''}
            viewerState={viewerState}
            requested={requested}
            autoFocus={shouldAutoFocus}
          />
        )}
      </div>
    </div>
  );
}

type SectionProps = { viewerState: ViewerState; requested: Set<number>; autoFocus: boolean };

function CodeSection({
  book,
  initialCode,
  viewerState,
  requested,
  autoFocus,
}: SectionProps & { book: 'hymn' | 'supplement'; initialCode: string }) {
  const id = useId();
  const [input, setInput] = useState(initialCode);
  // 只按了「附」還沒打數字時，不要馬上顯示格式錯誤
  const lookup = useSongByCode(book, input === APPENDIX_PREFIX ? '' : input);
  const statusId = `${id}-status`;

  return (
    <div className="space-y-6">
      <div className="board p-6 md:p-8">
        <label htmlFor={`${id}-code`} className="text-sm tracking-widest text-board-muted">
          {BOOK_LABELS[book]}第幾首？
        </label>
        <div className="mt-2">
          <BoardCodeInput
            id={`${id}-code`}
            book={book}
            value={input}
            onChange={setInput}
            autoFocus={autoFocus && initialCode === ''}
            describedBy={statusId}
            invalid={lookup.kind === 'invalid' || lookup.kind === 'notFound'}
          />
        </div>
        <p id={statusId} role="status" aria-live="polite" className="mt-4 min-h-6 text-sm">
          {lookup.kind === 'empty' && <span className="text-board-muted">輸入號碼，馬上幫你找。</span>}
          {lookup.kind === 'invalid' && <span className="text-[#ff9f92]">{lookup.message}</span>}
          {lookup.kind === 'loading' && (
            <span className="inline-flex items-center gap-2 text-board-muted">
              <span className="size-1.5 animate-pulse rounded-full bg-brass" />
              查詢中…
            </span>
          )}
          {lookup.kind === 'error' && <span className="text-[#ff9f92]">查詢失敗，請稍後再試</span>}
          {lookup.kind === 'notFound' && (
            <span className="text-[#ff9f92]">
              {book === 'hymn' ? '詩歌本沒有這一首（1–780、附1–6）' : '補充本沒有這一首'}
            </span>
          )}
          {lookup.kind === 'found' && <span className="text-brass">找到了 ✓</span>}
        </p>
      </div>

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

function TitleSearchSection({ viewerState, requested, autoFocus }: SectionProps) {
  const id = useId();
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
    <div className="space-y-6">
      <div>
        <label htmlFor={`${id}-title`} className="label">
          歌名
        </label>
        <input
          id={`${id}-title`}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="輸入歌名或其中幾個字"
          className="input min-h-16 font-serif text-xl font-bold md:text-2xl"
          autoComplete="off"
          autoFocus={autoFocus}
        />
      </div>

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
        <div role="status" aria-live="polite">
          {search.kind === 'loading' && (
            <div className="space-y-3">
              <span className="sr-only">搜尋中…</span>
              <div aria-hidden="true" className="skeleton h-16 rounded-2xl" />
              <div aria-hidden="true" className="skeleton h-16 rounded-2xl opacity-60" />
            </div>
          )}
          {search.kind === 'error' && <p className="text-sm text-danger">搜尋失敗，請稍後再試</p>}
          {search.kind === 'done' && (
            <div className="space-y-3">
              {search.results.length > 0 && <p className="text-sm text-muted">是這些嗎？</p>}
              <ul className="space-y-3">
                {search.results.map((song, i) => (
                  <li key={song.id} className="animate-rise" style={{ '--delay': `${i * 50}ms` } as React.CSSProperties}>
                    <button
                      type="button"
                      onClick={() => setSelected(song)}
                      className="card group flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors duration-300 hover:border-accent"
                    >
                      <span className="min-w-0">
                        <span className="font-serif text-lg font-bold">{songHeading(song)}</span>
                        {songSubtitle(song) && <span className="ml-3 text-sm text-muted">{songSubtitle(song)}</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {song.status === 'uploaded' && <span className="text-xs font-medium text-accent">已上傳</span>}
                        <span
                          aria-hidden="true"
                          className="text-muted transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:text-accent"
                        >
                          →
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setIsNewTitle(true)} className="btn-ghost w-full min-h-14">
                {search.results.length > 0 ? `都不是，點「${query}」` : `點「${query}」`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

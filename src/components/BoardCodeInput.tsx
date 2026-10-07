'use client';

import { useRef } from 'react';

type Props = {
  book: 'hymn' | 'supplement';
  value: string;
  onChange: (value: string) => void;
  id: string;
  name?: string;
  autoFocus?: boolean;
  describedBy?: string;
  invalid?: boolean;
};

const APPENDIX_PREFIX = '附';

/**
 * 號碼板上的大數字輸入。手機用數字鍵盤，所以詩歌本的「附」用旁邊的按鈕切換，
 * 輸入框本身也接受直接打「附1」（桌機或外接鍵盤）。
 */
export function BoardCodeInput({ book, value, onChange, id, name, autoFocus, describedBy, invalid }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAppendix = value.startsWith(APPENDIX_PREFIX);

  return (
    <div className="group/board">
      <div className="flex items-end gap-3">
        <input
          ref={inputRef}
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder={book === 'hymn' ? '384' : '101'}
          className="numeral w-full min-w-0 flex-1 bg-transparent text-[clamp(4.5rem,19vw,6.75rem)] font-medium leading-[1.05] text-board-ink caret-brass outline-none placeholder:text-board-ink/[0.14]"
        />
        {book === 'hymn' && (
          <button
            type="button"
            aria-pressed={hasAppendix}
            aria-label="附（附錄詩歌）"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange(hasAppendix ? value.slice(APPENDIX_PREFIX.length) : `${APPENDIX_PREFIX}${value}`);
              inputRef.current?.focus();
            }}
            className={`mb-3 grid size-12 shrink-0 place-items-center rounded-full border font-serif text-lg font-bold transition-colors duration-300 ${
              hasAppendix
                ? 'border-brass bg-brass text-board'
                : 'border-white/20 text-board-muted hover:border-brass hover:text-brass'
            }`}
          >
            附
          </button>
        )}
      </div>
      <div className="relative h-px bg-white/15">
        <span className="absolute inset-0 origin-left scale-x-0 bg-brass transition-transform duration-700 ease-[var(--ease-out)] group-focus-within/board:scale-x-100" />
      </div>
    </div>
  );
}

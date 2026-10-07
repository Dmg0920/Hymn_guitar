'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { BOOK_LABELS } from '@/lib/songs';
import { parseSongCode } from '@/lib/validation';
import { BoardCodeInput } from './BoardCodeInput';
import { Segmented } from './Segmented';

type HeroBook = 'hymn' | 'supplement';

const OPTIONS = [
  { value: 'hymn', label: BOOK_LABELS.hymn },
  { value: 'supplement', label: BOOK_LABELS.supplement },
] as const satisfies readonly { value: HeroBook; label: string }[];

/** 首頁的快速點歌：輸入號碼 → 直接帶到點歌頁並查好那一首。沒有 JS 時退化成 GET 表單。 */
export function HeroBoard() {
  const router = useRouter();
  const id = useId();
  const [book, setBook] = useState<HeroBook>('hymn');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // 不重掛載 form（會讓輸入框失去焦點）：移除 class、強制 reflow、再加回，重播搖晃動畫
  const rejectInput = (message: string) => {
    setError(message);
    setErrorCount((n) => n + 1); // 換 key 讓 role=alert 重新插入，連續兩次相同錯誤也會再朗讀一次
    const form = formRef.current;
    if (!form) return;
    form.classList.remove('animate-shake');
    void form.offsetWidth;
    form.classList.add('animate-shake');
    form.querySelector<HTMLInputElement>('input[name=code]')?.focus();
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseSongCode(book, code);
    if (!parsed.ok) return rejectInput(parsed.error);
    router.push(`/request?book=${book}&code=${encodeURIComponent(parsed.value)}`);
  };

  return (
    <form
      ref={formRef}
      action="/request"
      onSubmit={onSubmit}
      noValidate
      className="board p-5 sm:p-7"
    >
      <input type="hidden" name="book" value={book} />

      <div className="flex items-center justify-between gap-4">
        <p className="shrink-0 whitespace-nowrap text-sm font-medium tracking-[0.2em] text-board-muted">快速點歌</p>
        <Segmented
          tone="board"
          label="選擇詩歌本"
          idPrefix={id}
          options={OPTIONS}
          value={book}
          onChange={(next) => {
            setBook(next);
            // 補充本沒有「附」，切過去時把前綴拿掉（數字保留）
            if (next === 'supplement') setCode((c) => c.replace(/^附/, ''));
            setError(null);
          }}
          className="min-w-0 max-w-52 flex-1"
        />
      </div>

      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${book}`} className="mt-6">
        <label htmlFor={`${id}-code`} className="text-sm tracking-widest text-board-muted">
          {BOOK_LABELS[book]}第幾首？
        </label>
        <div className="mt-1">
          <BoardCodeInput
            id={`${id}-code`}
            name="code"
            book={book}
            value={code}
            onChange={(next) => {
              setCode(next);
              setError(null);
            }}
            describedBy={error ? `${id}-error` : undefined}
            invalid={Boolean(error)}
          />
        </div>
      </div>

      <p key={errorCount} id={`${id}-error`} role="alert" className="mt-3 min-h-6 text-sm text-[#ff9f92]">
        {error}
      </p>

      <button type="submit" className="btn-primary group mt-2 min-h-14 w-full text-base">
        查詢這一首
        <span aria-hidden="true" className="transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-1.5">
          →
        </span>
      </button>

      <p className="mt-4 text-center text-sm text-board-muted">
        沒有號碼？
        <Link href="/request?book=other" className="ml-1 text-board-ink underline decoration-brass/60 underline-offset-4 hover:decoration-brass">
          用歌名搜尋
        </Link>
      </p>
    </form>
  );
}

'use client';

import { useState } from 'react';

const MIN_ITEMS = 8;

type Props = {
  items: string[];
  /** 給螢幕閱讀器的區塊名稱。 */
  label: string;
};

/**
 * 橫向跑馬燈。內容複製成兩列並平移 -50%，所以循環是無縫的。
 * - 有暫停鈕（自動移動的內容要能讓人停下來，WCAG 2.2.2），hover 也會暫停。
 * - 減少動態時不捲動，改成自動換行把全部內容列出來（練習中的歌只出現在這裡，不能被裁掉）。
 * - 為了撐滿寬度而重複的內容，以及第二列，一律 aria-hidden，螢幕閱讀器只會念一遍。
 */
export function Marquee({ items, label }: Props) {
  const [isPaused, setIsPaused] = useState(false);
  if (items.length === 0) return null;
  const repeats = Math.ceil(MIN_ITEMS / items.length);

  const row = (isDuplicateRow: boolean) => (
    <ul
      aria-hidden={isDuplicateRow || undefined}
      className={`flex shrink-0 items-center gap-10 pr-10 motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:gap-x-8 motion-reduce:gap-y-2 motion-reduce:pr-0 ${
        isDuplicateRow ? 'motion-reduce:hidden' : ''
      }`}
    >
      {Array.from({ length: repeats }, (_, copy) =>
        items.map((text, i) => (
          <li
            key={`${copy}-${i}`}
            aria-hidden={copy > 0 || undefined}
            className={`flex items-center gap-10 whitespace-nowrap font-serif text-3xl font-bold tracking-wide motion-reduce:gap-8 md:text-5xl ${
              copy > 0 ? 'motion-reduce:hidden' : ''
            }`}
          >
            {text}
            <span aria-hidden="true" className="text-accent">
              ✦
            </span>
          </li>
        )),
      )}
    </ul>
  );

  return (
    <div role="group" aria-label={label} className="relative overflow-hidden border-y border-line bg-paper-2/50 py-5 md:py-7">
      <div
        className={`flex w-max animate-[marquee_60s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none ${
          isPaused ? '[animation-play-state:paused]' : ''
        }`}
      >
        {row(false)}
        {row(true)}
      </div>

      <button
        type="button"
        onClick={() => setIsPaused((v) => !v)}
        aria-label={isPaused ? '播放跑馬燈' : '暫停跑馬燈'}
        className="absolute right-4 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-field bg-paper/90 text-ink backdrop-blur transition-colors hover:border-accent hover:text-accent motion-reduce:hidden md:right-8"
      >
        {isPaused ? (
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current">
            <path d="M4 2.5v11l9-5.5z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current">
            <path d="M3.5 2h3v12h-3zM9.5 2h3v12h-3z" />
          </svg>
        )}
      </button>
    </div>
  );
}

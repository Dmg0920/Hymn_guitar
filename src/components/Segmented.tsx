'use client';

import { useRef } from 'react';

type Option<T extends string> = { value: T; label: string };

/** 變更來源：鍵盤切換時，呼叫端不應該把焦點搶走（會讓人無法繼續用方向鍵切換）。 */
export type SegmentedSource = 'keyboard' | 'pointer';

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T, source: SegmentedSource) => void;
  /** 用來產生 tab / tabpanel 的 id，呼叫端的 tabpanel 要用同一組：`${idPrefix}-panel`。 */
  idPrefix: string;
  label: string;
  /** board：給深色號碼板用。 */
  tone?: 'paper' | 'board';
  className?: string;
};

/** 有滑動指示塊的分段控制，遵循 ARIA tabs 的鍵盤操作（← → Home End）。 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  idPrefix,
  label,
  tone = 'paper',
  className = '',
}: Props<T>) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const move = (to: number) => {
    const wrapped = (to + options.length) % options.length;
    const next = options[wrapped];
    if (!next) return;
    onChange(next.value, 'keyboard');
    buttonRefs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    // Cmd+← 等瀏覽器 / 系統快捷鍵不能被吃掉
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: options.length - 1,
    };
    const target = keys[event.key];
    if (target === undefined) return;
    event.preventDefault();
    move(target);
  };

  const isBoard = tone === 'board';

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`relative grid rounded-full p-1 text-sm ${
        isBoard ? 'bg-white/[0.06] ring-1 ring-white/25' : 'border border-field bg-card'
      } ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 rounded-full transition-transform duration-500 ease-[var(--ease-out)] ${
          isBoard ? 'bg-brass' : 'bg-accent'
        }`}
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${idPrefix}-tab-${option.value}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value, 'pointer')}
            className={`relative z-10 min-h-10 rounded-full px-3 py-2 font-medium tracking-wide transition-colors duration-300 ${
              selected
                ? isBoard
                  ? 'text-board'
                  : 'text-accent-ink'
                : isBoard
                  ? 'text-board-muted hover:text-board-ink'
                  : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

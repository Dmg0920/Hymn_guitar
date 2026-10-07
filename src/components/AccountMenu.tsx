'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { signOut } from '@/app/login/actions';

type Props = { nickname: string | null; isAdmin: boolean };

const menuItem =
  'flex min-h-11 items-center justify-between rounded-xl px-3 text-[0.9375rem] font-medium transition-colors hover:bg-paper-2';

/** 帳號選單：頭像按鈕展開，點外面 / 按 Esc / 點選項都會收合。 */
export function AccountMenu({ nickname, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const initial = nickname ? (Array.from(nickname)[0] ?? '?') : '?';

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        // Tab 離開整個選單時收合（焦點移到選單內部的連結不算離開）
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={nickname ? `帳號選單：${nickname}` : '帳號選單：設定暱稱'}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-2 rounded-full border border-field bg-card py-1 pl-1 pr-1 transition-colors hover:border-accent sm:pr-4"
      >
        <span className="grid size-8 place-items-center rounded-full bg-accent font-serif text-sm font-bold text-accent-ink">
          {initial}
        </span>
        <span className="hidden max-w-28 truncate text-sm font-medium sm:block">{nickname ?? '設定暱稱'}</span>
      </button>

      <div
        id={menuId}
        inert={!open}
        data-open={open}
        onClick={() => setOpen(false)}
        className="card absolute right-0 top-[calc(100%+0.625rem)] z-50 w-60 origin-top-right scale-95 p-2 opacity-0 shadow-2xl shadow-black/15 transition duration-300 ease-[var(--ease-out)] data-[open=true]:scale-100 data-[open=true]:opacity-100"
      >
        <p className="px-3 pb-2 pt-1.5 text-xs text-muted">
          {nickname ? (
            <>
              目前登入：<span className="font-semibold text-ink">{nickname}</span>
            </>
          ) : (
            '還沒有暱稱，點歌前需要設定'
          )}
        </p>
        {!nickname && (
          <Link href="/onboarding" className={`${menuItem} text-accent`}>
            設定暱稱 <span aria-hidden="true">→</span>
          </Link>
        )}
        <Link href="/me" className={menuItem}>
          我的點歌 <span aria-hidden="true" className="text-muted">→</span>
        </Link>
        <Link href="/feedback" className={menuItem}>
          意見箱 <span aria-hidden="true" className="text-muted">→</span>
        </Link>
        {isAdmin && (
          <Link href="/admin" className={menuItem}>
            後台 <span aria-hidden="true" className="text-muted">→</span>
          </Link>
        )}
        <div className="my-1.5 h-px bg-line" />
        <form action={signOut}>
          <button type="submit" className={`${menuItem} w-full text-muted hover:text-danger`}>
            登出
          </button>
        </form>
      </div>
    </div>
  );
}

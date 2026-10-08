'use client';

import { startTransition } from 'react';
import { markUploadSeen } from './actions';

type Props = { songId: number; postUrl: string; isUnseen: boolean };

/** 「去聽」連結。第一次點開時順便把這首標成已讀（連結本身照常在新分頁開啟，標記失敗也不影響）。 */
export function ListenLink({ songId, postUrl, isUnseen }: Props) {
  return (
    <a
      href={postUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        if (isUnseen) startTransition(() => markUploadSeen(songId));
      }}
      className="btn-primary group min-h-11 w-full"
    >
      去聽
      <span aria-hidden="true" className="transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:-translate-y-0.5">
        ↗
      </span>
    </a>
  );
}

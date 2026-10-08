'use client';

import { useState } from 'react';

/** 複製公開檔案的完整網址（在點擊時才讀 window.location，避免 SSR 與 hydrate 不一致）。 */
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
    setTimeout(() => setCopied('idle'), 2500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="btn min-h-11 border border-board-ink/30 px-6 text-board-ink hover:border-brass hover:text-brass"
    >
      <span role="status">{copied === 'ok' ? '已複製連結' : copied === 'failed' ? '無法複製，請手動複製網址' : '複製公開連結'}</span>
    </button>
  );
}

'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card space-y-4 p-6 text-center">
      <p className="text-lg font-semibold">糟糕，出了點問題</p>
      <p className="text-sm text-muted">可能是網路不穩，請稍後再試。</p>
      <button type="button" onClick={() => retry()} className="btn-primary">
        重新載入
      </button>
    </div>
  );
}

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
    <section className="wrap-narrow flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <p className="numeral text-6xl font-medium italic text-accent">♪?</p>
      <h1 className="mt-4 font-serif text-2xl font-bold">糟糕，出了點問題</h1>
      <p className="mt-2 text-muted">可能是網路不穩，請稍後再試。</p>
      <button type="button" onClick={() => retry()} className="btn-primary mt-8">
        重新載入
      </button>
    </section>
  );
}

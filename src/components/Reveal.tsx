'use client';

import { useEffect, useRef } from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** 同組元素錯開進場的延遲（毫秒）。 */
  delay?: number;
  as?: 'div' | 'li' | 'section' | 'article';
};

const VIEWPORT_FOLD = 0.92;

/**
 * 捲動進場。SSR 與首屏內的元素一律直接顯示（不會閃一下再消失），
 * 只有首屏以下的元素才會在掛載後被標成 hidden，進入視窗時再顯示。
 * 狀態直接寫在 DOM 屬性上，不經過 React state。
 */
export function Reveal({ children, className, delay = 0, as = 'div' }: Props) {
  const Tag = as as React.ElementType;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight * VIEWPORT_FOLD) return;

    element.dataset.reveal = 'hidden';
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        element.dataset.reveal = 'shown';
        observer.disconnect();
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} data-reveal="shown" className={className} style={{ '--delay': `${delay}ms` } as React.CSSProperties}>
      {children}
    </Tag>
  );
}

'use client';

import { useEffect, useRef } from 'react';

const DURATION_MS = 1400;

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * 進入視窗時從 0 滾動到目標數字。SSR 輸出最終數字，沒有 JS 或減少動態時就是靜態的。
 * 只改 React 擁有的那個 text node 的 nodeValue（不替換節點），cleanup 也不回寫舊值。
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    const textNode = element?.firstChild;
    if (!element || !textNode || value <= 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const run = () => {
      const startedAt = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - startedAt) / DURATION_MS, 1);
        textNode.nodeValue = String(Math.round(value * easeOutExpo(progress)));
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      textNode.nodeValue = '0';
      frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        run();
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

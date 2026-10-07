'use client';

import { useEffect, useRef } from 'react';

/**
 * 六條吉他弦。滑鼠劃過、點一下或觸控點擊都會撥動最近的弦，
 * 振動是真實的「三角初始形狀 × 指數衰減 × 餘弦」，不是循環動畫。
 * 事件掛在最近的 <section> 上（弦容器在負 z-index，上面蓋著內容，掛在容器本身收不到事件），
 * 座標一律以 svg 為準；事件只是冒泡經過，不會擋住內容的點擊。
 */

// 由細到粗（高音 e → 低音 E），振動頻率相反
const STRINGS = [
  { width: 1, freq: 9.6 },
  { width: 1.3, freq: 8.4 },
  { width: 1.7, freq: 7.3 },
  { width: 2.1, freq: 6.3 },
  { width: 2.6, freq: 5.4 },
  { width: 3.2, freq: 4.6 },
] as const;

const SEGMENTS = 56;
const DECAY_PER_SECOND = 3.1;
const MIN_AMPLITUDE = 0.2;
const MAX_AMPLITUDE = 30;
const TOUCH_REACH_PX = 40;
const INTRO_START_MS = 450;
const INTRO_STEP_MS = 85;

type StringState = { amplitude: number; startedAt: number; pivot: number; active: boolean };

type Props = {
  className?: string;
  /** 弦分布在容器高度的哪個區段（0–1）。 */
  band?: readonly [number, number];
  /** 載入時自動「掃弦」一次。 */
  intro?: boolean;
};

const DEFAULT_BAND = [0.1, 0.9] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function GuitarStrings({ className = '', band = DEFAULT_BAND, intro = true }: Props) {
  const [bandStart, bandEnd] = band;
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const svg = svgRef.current;
    const host = svg?.closest('section') ?? svg?.parentElement;
    if (!svg || !host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const states: StringState[] = STRINGS.map(() => ({ amplitude: 0, startedAt: 0, pivot: 0.5, active: false }));
    const size = { width: 0, height: 0 };
    const stringY = (i: number) => (bandStart + ((bandEnd - bandStart) * i) / (STRINGS.length - 1)) * size.height;
    let frame = 0;
    let last: { x: number; y: number; t: number } | null = null;
    const timers: number[] = [];

    const measure = () => {
      const rect = svg.getBoundingClientRect();
      size.width = rect.width;
      size.height = rect.height;
    };
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(svg);
    measure();

    const setVisible = (i: number, vibrating: boolean) => {
      const line = lineRefs.current[i];
      const path = pathRefs.current[i];
      if (line) line.style.visibility = vibrating ? 'hidden' : 'visible';
      if (path) path.style.visibility = vibrating ? 'visible' : 'hidden';
    };

    const tick = (now: number) => {
      let anyActive = false;
      states.forEach((state, i) => {
        if (!state.active) return;
        const elapsed = (now - state.startedAt) / 1000;
        const envelope = state.amplitude * Math.exp(-DECAY_PER_SECOND * elapsed);
        if (Math.abs(envelope) < MIN_AMPLITUDE) {
          state.active = false;
          setVisible(i, false);
          return;
        }
        anyActive = true;
        const y0 = stringY(i);
        const wave = Math.cos(2 * Math.PI * STRINGS[i].freq * elapsed);
        let d = '';
        for (let k = 0; k <= SEGMENTS; k++) {
          const u = k / SEGMENTS;
          const shape = u < state.pivot ? u / state.pivot : (1 - u) / (1 - state.pivot);
          d += `${k === 0 ? 'M' : 'L'}${(u * size.width).toFixed(1)} ${(y0 + envelope * wave * shape).toFixed(2)}`;
        }
        pathRefs.current[i]?.setAttribute('d', d);
      });
      frame = anyActive ? requestAnimationFrame(tick) : 0;
    };

    const pluck = (i: number, pivot: number, amplitude: number) => {
      states[i] = {
        amplitude: clamp(amplitude, -MAX_AMPLITUDE, MAX_AMPLITUDE),
        startedAt: performance.now(),
        pivot: clamp(pivot, 0.08, 0.92),
        active: true,
      };
      setVisible(i, true);
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const toLocal = (event: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onMove = (event: PointerEvent) => {
      const { x, y } = toLocal(event);
      const now = performance.now();
      if (last && event.pointerType !== 'touch') {
        const dt = Math.max(now - last.t, 1);
        const speed = Math.hypot(x - last.x, y - last.y) / dt; // px / ms
        STRINGS.forEach((_, i) => {
          const sy = stringY(i);
          const crossed = (last!.y - sy) * (y - sy) < 0;
          if (!crossed) return;
          const direction = Math.sign(y - last!.y) || 1;
          pluck(i, x / size.width, direction * clamp(speed * 16, 6, MAX_AMPLITUDE));
        });
      }
      last = { x, y, t: now };
    };

    const onDown = (event: PointerEvent) => {
      const { x, y } = toLocal(event);
      let nearest = 0;
      let distance = Infinity;
      STRINGS.forEach((_, i) => {
        const d = Math.abs(stringY(i) - y);
        if (d < distance) {
          distance = d;
          nearest = i;
        }
      });
      if (distance <= TOUCH_REACH_PX) pluck(nearest, x / size.width, y >= stringY(nearest) ? -14 : 14);
    };

    const onLeave = () => {
      last = null;
    };

    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointerleave', onLeave);

    if (intro) {
      STRINGS.forEach((_, i) => {
        timers.push(window.setTimeout(() => pluck(i, 0.35 + i * 0.07, 7 + i), INTRO_START_MS + i * INTRO_STEP_MS));
      });
    }

    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointerleave', onLeave);
      resizeObserver.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
      if (frame) cancelAnimationFrame(frame);
      STRINGS.forEach((_, i) => setVisible(i, false)); // 振動到一半被重跑時，不要讓弦卡在隱藏狀態
    };
  }, [bandStart, bandEnd, intro]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full [mask-image:linear-gradient(to_right,transparent,#000_9%,#000_91%,transparent)] ${className}`}
    >
      {STRINGS.map((string, i) => {
        const y = `${(bandStart + ((bandEnd - bandStart) * i) / (STRINGS.length - 1)) * 100}%`;
        return (
          <g key={i}>
            <line
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              x1="0"
              x2="100%"
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeWidth={string.width}
            />
            <path
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={string.width}
              strokeLinejoin="round"
              style={{ visibility: 'hidden' }}
            />
          </g>
        );
      })}
    </svg>
  );
}

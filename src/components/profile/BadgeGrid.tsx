import type { Badge } from '@/lib/badges';

/** 徽章牆：已獲得的亮起來，未獲得的淡化並顯示條件與進度。 */
export function BadgeGrid({ badges }: { badges: Badge[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {badges.map((badge) => (
        <li
          key={badge.id}
          className={`card flex flex-col gap-1 p-4 ${
            badge.earned ? 'border-accent/40 bg-accent-soft/60' : 'text-muted'
          }`}
        >
          <span
            aria-hidden="true"
            className={`numeral text-2xl font-medium italic leading-none ${badge.earned ? 'text-accent' : 'text-line-strong'}`}
          >
            {badge.earned ? '♪' : '·'}
          </span>
          <p className={`mt-1 font-serif text-lg font-bold leading-snug ${badge.earned ? 'text-ink' : ''}`}>
            {badge.label}
          </p>
          <p className="text-xs">
            {badge.earned ? '已獲得' : badge.hint}
            <span className="sr-only">{badge.earned ? '' : '，尚未獲得'}</span>
          </p>
          {!badge.earned && badge.progress && (
            <p className="numeral text-sm tabular-nums">
              {badge.progress.current} / {badge.progress.target}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

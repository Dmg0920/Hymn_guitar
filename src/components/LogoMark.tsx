const STRING_COUNT = 6;
const FIRST_Y = 8.5;
const STRING_GAP = 3;

/** 站徽：六條弦的號碼板小方塊。放在 `group` 內，hover 時六條弦依序起伏。 */
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="var(--board)" stroke="var(--board-ink)" strokeOpacity="0.22" />
      {Array.from({ length: STRING_COUNT }, (_, i) => (
        <line
          key={i}
          x1="6"
          x2="26"
          y1={FIRST_Y + i * STRING_GAP}
          y2={FIRST_Y + i * STRING_GAP}
          stroke={i === 2 ? 'var(--brass)' : 'var(--board-ink)'}
          strokeWidth={0.8 + i * 0.28}
          strokeLinecap="round"
          opacity={i === 2 ? 1 : 0.85}
          className="origin-center [transform-box:fill-box] group-hover:[animation:string-wave_0.8s_ease-in-out_1]"
          style={{ animationDelay: `${i * 55}ms` }}
        />
      ))}
    </svg>
  );
}

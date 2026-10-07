const CIRCLE_LENGTH = 151; // 2πr，r = 24
const CHECK_LENGTH = 40;

/** 成功打勾：圓圈與勾依序「畫」出來。 */
export function SuccessMark({ className = 'size-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" aria-hidden="true" className={`animate-pop text-ok ${className}`}>
      <circle
        cx="28"
        cy="28"
        r="24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{
          strokeDasharray: CIRCLE_LENGTH,
          strokeDashoffset: CIRCLE_LENGTH,
          animation: 'draw 0.7s var(--ease-out) 0.05s forwards',
        }}
      />
      <path
        d="M17 29.5l7.5 7.5L39 21"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: CHECK_LENGTH,
          strokeDashoffset: CHECK_LENGTH,
          animation: 'draw 0.5s var(--ease-out) 0.45s forwards',
        }}
      />
    </svg>
  );
}

import Link from 'next/link';

/** 「最新上傳」尚未填滿時的空位：同時是通往點歌的入口。 */
export function EmptySlot({ className = '' }: { className?: string }) {
  return (
    <Link href="/request" className={`group/slot flex flex-col gap-4 ${className}`}>
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[1.25rem] border border-dashed border-line-strong bg-card/40 transition-colors duration-500 group-hover/slot:border-accent group-hover/slot:bg-accent-soft/40">
        <span
          aria-hidden="true"
          className="numeral text-[clamp(3rem,9vw,5rem)] font-medium italic leading-none text-line-strong transition-all duration-500 ease-[var(--ease-out)] group-hover/slot:scale-110 group-hover/slot:text-accent"
        >
          +
        </span>
      </div>
      <div className="px-1">
        <p className="text-xs font-medium tracking-[0.2em] text-muted">NEXT</p>
        <p className="mt-1 font-serif text-lg font-bold leading-snug transition-colors group-hover/slot:text-accent">
          下一首，等你來點
        </p>
      </div>
    </Link>
  );
}

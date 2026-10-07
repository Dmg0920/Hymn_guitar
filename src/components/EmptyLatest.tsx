import Link from 'next/link';

/** 還沒有任何上傳時的空狀態：不放一排空方塊，改成一塊號碼板邀請第一次點歌。 */
export function EmptyLatest() {
  return (
    <div className="board relative overflow-hidden px-6 py-16 text-center md:py-24">
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full opacity-[0.14] [mask-image:linear-gradient(to_bottom,#000,transparent_30%,transparent_70%,#000)]"
        preserveAspectRatio="none"
      >
        {[18, 34, 50, 66, 82].map((y, i) => (
          <line key={y} x1="0" x2="100%" y1={`${y}%`} y2={`${y}%`} stroke="var(--board-ink)" strokeWidth={0.8 + i * 0.3} />
        ))}
      </svg>
      <div className="relative">
        <p className="numeral text-7xl font-medium italic leading-none text-brass">♪</p>
        <h3 className="mt-6 text-balance font-serif text-2xl font-black tracking-wide sm:text-3xl md:text-5xl">第一首，等你來點</h3>
        <p className="mx-auto mt-4 max-w-sm text-balance text-board-muted">還沒有上傳的詩歌。點一首你想聽的，上傳後會出現在這裡。</p>
        <Link href="/request" className="btn-primary group mt-8 min-h-14 px-8 text-base">
          我要點歌
          <span aria-hidden="true" className="transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-1.5">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}

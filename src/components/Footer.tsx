import Link from 'next/link';
import { SITE } from '@/lib/site';

/** 頁尾：大型 CTA、導覽、浮水印字。 */
export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line bg-paper-2/60">
      <div className="staff absolute inset-x-0 top-0" aria-hidden="true" />

      <div className="wrap relative z-10 grid gap-12 pb-44 pt-20 md:grid-cols-[1.4fr_1fr] md:pb-56">
        <div>
          <p className="eyebrow">Next song</p>
          <h2 className="mt-5 font-serif text-4xl font-black leading-[1.15] tracking-wide md:text-6xl">
            想聽哪一首？
            <br />
            <span className="text-accent">告訴我。</span>
          </h2>
          <Link href="/request" className="btn-primary group mt-9 min-h-14 px-8 text-base">
            我要點歌
            <span aria-hidden="true" className="transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-1.5">
              →
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm md:content-end md:justify-items-end">
          <nav aria-label="頁尾" className="space-y-3">
            <p className="eyebrow">Pages</p>
            <ul className="space-y-1">
              <li>
                <Link href="/" className="inline-block py-1 text-base transition-colors hover:text-accent">
                  首頁
                </Link>
              </li>
              <li>
                <Link href="/request" className="inline-block py-1 text-base transition-colors hover:text-accent">
                  點歌
                </Link>
              </li>
              <li>
                <Link href="/me" className="inline-block py-1 text-base transition-colors hover:text-accent">
                  我的點歌
                </Link>
              </li>
            </ul>
          </nav>
          <div className="space-y-3">
            <p className="eyebrow">Follow</p>
            {SITE.instagramUrl && (
              <a
                href={SITE.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block py-1 text-base transition-colors hover:text-accent"
              >
                Instagram ↗
              </a>
            )}
            <p className="max-w-[16ch] text-muted">24 小時內最多點 10 首。</p>
          </div>
        </div>
      </div>

      {/* 浮水印：被頁面底部裁切，只露出上半 */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[0.22em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-serif text-[26vw] font-black leading-none tracking-[0.04em] text-ink/[0.045] md:text-[17rem]"
      >
        {SITE.name}
      </p>
    </footer>
  );
}

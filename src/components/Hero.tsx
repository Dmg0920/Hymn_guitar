import Link from 'next/link';
import { SITE } from '@/lib/site';
import { GuitarStrings } from './GuitarStrings';
import { HeroBoard } from './HeroBoard';

const lineIn = 'block animate-[line-in_1.1s_var(--ease-out)_backwards]';

/** 首頁 hero：大字標題 + 可撥動的六弦 + 快速點歌號碼板。 */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(55%_50%_at_18%_32%,color-mix(in_oklab,var(--accent)_15%,transparent),transparent_70%)]"
      />
      <div className="wrap grid grid-cols-1 items-end gap-12 pb-16 pt-12 md:grid-cols-12 md:gap-8 md:pb-24 md:pt-20">
        <div className="md:col-span-7">
          {/* 弦只存在於「標題區」後面（寬度滿版），不會穿過內文 */}
          <div className="relative py-6">
            <div className="absolute inset-y-0 -z-10 w-screen [left:calc(var(--gutter)*-1)]">
              <GuitarStrings className="text-ink/[0.24]" band={[0.04, 0.96]} />
            </div>
            <p className="eyebrow animate-fade [--delay:100ms]">Hymns on guitar</p>

            <h1 className="mt-6 font-serif text-[clamp(6rem,27vw,9.5rem)] font-black leading-[1.04] tracking-[0.02em] md:text-[clamp(6.5rem,12.5vw,11.5rem)]">
              <span className="block overflow-hidden py-[0.03em]">
                <span className={lineIn}>詩歌</span>
              </span>
              <span className="block overflow-hidden py-[0.03em] pl-[0.7em] text-accent">
                <span className={lineIn} style={{ animationDelay: '140ms' }}>
                  點唱
                </span>
              </span>
            </h1>
          </div>

          <p className="animate-rise mt-4 max-w-md text-balance text-lg leading-relaxed text-muted [--delay:450ms]">{SITE.description}</p>

          <div className="animate-rise mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-[0.9375rem] font-medium [--delay:550ms]">
            <Link href="#latest" className="group inline-flex items-center gap-2 transition-colors hover:text-accent">
              看最新上傳
              <span aria-hidden="true" className="transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-y-1">
                ↓
              </span>
            </Link>
            {SITE.instagramUrl && (
              <a
                href={SITE.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 transition-colors hover:text-accent"
              >
                Instagram
                <span
                  aria-hidden="true"
                  className="transition-transform duration-500 ease-[var(--ease-out)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                >
                  ↗
                </span>
              </a>
            )}
          </div>
        </div>

        <div className="animate-rise [--delay:350ms] md:col-span-5">
          <HeroBoard />
        </div>
      </div>
    </section>
  );
}

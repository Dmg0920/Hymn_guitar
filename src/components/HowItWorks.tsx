import { Reveal } from './Reveal';

const STEPS = [
  {
    title: '輸入號碼',
    body: '選詩歌本或補充本，輸入號碼；不確定號碼就用歌名搜尋。',
  },
  {
    title: '等我練習',
    body: '點的人越多，越早排進練習。進度會顯示在「我的點歌」。',
  },
  {
    title: '上傳聆聽',
    body: '貼文上傳後，首頁和「我的點歌」都找得到，點開就能聽。',
  },
] as const;

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="wrap pb-8 pt-4 md:pt-12">
      <Reveal>
        <p className="eyebrow">How it works</p>
        <h2 id="how-title" className="mt-4 font-serif text-3xl font-black tracking-wide md:text-5xl">
          三步，聽見你點的歌
        </h2>
      </Reveal>

      <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} as="li" delay={i * 120} className="group relative border-t border-line-strong pt-6">
            <span
              aria-hidden="true"
              className="numeral block text-[6.5rem] font-medium italic leading-none text-transparent transition-colors duration-500 [-webkit-text-stroke:1.5px_var(--accent)] group-hover:text-accent/15"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-5 font-serif text-2xl font-bold tracking-wide">{step.title}</h3>
            <p className="mt-2 max-w-xs leading-relaxed text-muted">{step.body}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

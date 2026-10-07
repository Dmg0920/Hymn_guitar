import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { GuitarStrings } from '@/components/GuitarStrings';
import { getViewer } from '@/lib/auth';
import { safeNextPath } from '@/lib/validation';
import { LoginForms } from './LoginForms';

export const metadata: Metadata = { title: '登入' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(Array.isArray(next) ? next[0] : next);

  if (await getViewer()) redirect(nextPath);

  return (
    <section className="relative isolate overflow-hidden pb-8 pt-12 md:pt-20">
      <div className="wrap-narrow">
        {/* 弦只在標題後面，不穿過副標 */}
        <div className="relative py-2">
          <div className="absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2">
            <GuitarStrings className="text-ink/[0.2]" band={[0.06, 0.94]} intro={false} />
          </div>
          <p className="eyebrow">Welcome</p>
          <h1 className="mt-4 font-serif text-5xl font-black tracking-wide md:text-6xl">登入 / 註冊</h1>
        </div>
        <p className="mt-4 text-balance text-muted">登入後就能點歌，也能在「我的點歌」看到進度。</p>
        <div className="mt-8">
          <LoginForms next={nextPath} />
        </div>
      </div>
    </section>
  );
}

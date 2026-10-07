import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { safeNextPath } from '@/lib/validation';
import { NicknameForm } from './NicknameForm';

export const metadata: Metadata = { title: '設定暱稱' };

export default async function OnboardingPage({ searchParams }: PageProps<'/onboarding'>) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(Array.isArray(next) ? next[0] : next);

  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent('/onboarding')}`);

  return (
    <section className="wrap-narrow pb-8 pt-12 md:pt-20">
      <p className="eyebrow">Nickname</p>
      <h1 className="mt-4 font-serif text-5xl font-black tracking-wide md:text-6xl">怎麼稱呼你？</h1>
      <p className="mt-4 text-balance text-muted">點歌時會顯示這個名字。</p>
      <div className="mt-8">
        <NicknameForm next={nextPath} defaultValue={viewer.nickname ?? ''} />
      </div>
    </section>
  );
}

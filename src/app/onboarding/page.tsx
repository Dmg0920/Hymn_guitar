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
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-center text-xl font-bold">設定暱稱</h1>
      <p className="mb-6 text-center text-sm text-muted">點歌時會顯示這個名字。</p>
      <NicknameForm next={nextPath} defaultValue={viewer.nickname ?? ''} />
    </div>
  );
}

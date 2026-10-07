import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { safeNextPath } from '@/lib/validation';
import { LoginForms } from './LoginForms';

export const metadata: Metadata = { title: '登入' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(Array.isArray(next) ? next[0] : next);

  if (await getViewer()) redirect(nextPath);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-center text-xl font-bold">登入 / 註冊</h1>
      <LoginForms next={nextPath} />
    </div>
  );
}

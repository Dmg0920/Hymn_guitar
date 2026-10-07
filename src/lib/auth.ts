import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Viewer = {
  id: string;
  username: string | null;
  nickname: string | null;
  isAdmin: boolean;
};

/** 帳號密碼註冊的使用者在 Supabase Auth 裡用的內部 email，不會寄信。 */
export function usernameToEmail(username: string): string {
  const domain = process.env.USERNAME_EMAIL_DOMAIN || 'users.hymn-guitar.invalid';
  return `${username}@${domain}`;
}

export function isUsernameEmail(email: string): boolean {
  return email.endsWith(`@${usernameToEmail('x').split('@')[1]}`);
}

/** 目前登入者（同一個 request 內只查一次）。未登入回傳 null。 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username, nickname, is_admin')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`讀取個人資料失敗：${error.message}`);

  return {
    id,
    username: profile?.username ?? null,
    nickname: profile?.nickname ?? null,
    isAdmin: profile?.is_admin ?? false,
  };
});

/** 需要登入且已設定暱稱的頁面使用。 */
export async function requireViewer(nextPath: string): Promise<Viewer> {
  const viewer = await getViewer();
  const next = encodeURIComponent(nextPath);
  if (!viewer) redirect(`/login?next=${next}`);
  if (!viewer.nickname) redirect(`/onboarding?next=${next}`);
  return viewer;
}

/** 管理員頁面與 action 使用；非管理員一律 404，不透露後台存在。 */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer('/admin');
  if (!viewer.isAdmin) notFound();
  return viewer;
}

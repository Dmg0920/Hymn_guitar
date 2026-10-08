import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '使用者（後台）' };

const LIST_LIMIT = 200;

type Row = {
  id: string;
  username: string | null;
  nickname: string | null;
  is_admin: boolean;
  created_at: string;
};

export default async function AdminUsersPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from('profiles')
    .select('id, username, nickname, is_admin, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw new Error(`讀取使用者失敗：${error.message}`);

  const users = (data ?? []) as Row[];
  const total = count ?? users.length;

  return (
    <section className="wrap-medium space-y-8 pb-8 pt-12 md:pt-20">
      <div>
        <p className="eyebrow">Users</p>
        <h1 className="mt-4 font-serif text-5xl font-black tracking-wide md:text-6xl">使用者</h1>
        <p className="mt-4 text-sm text-muted">
          <Link href="/admin" className="text-accent underline underline-offset-4">
            回後台
          </Link>
          ・共 {total} 位{total > users.length && `（僅顯示最新 ${users.length} 位）`}
        </p>
      </div>

      {users.length === 0 ? (
        <p className="card px-6 py-14 text-center text-muted">還沒有使用者</p>
      ) : (
        <ul className="space-y-3">
          {users.map((user) => (
            <li key={user.id} className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <span className="break-words">{user.nickname ?? '（未設定暱稱）'}</span>
                  {user.is_admin && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">
                      管理員
                    </span>
                  )}
                </p>
                <p className="mt-1 break-all text-sm text-muted">
                  {user.username ? `帳號：${user.username}` : 'Email 登入'}
                </p>
              </div>
              <p className="text-sm text-muted">加入於 {formatDate(user.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

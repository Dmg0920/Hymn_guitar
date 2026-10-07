import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { FeedbackItem, type FeedbackEntry } from './FeedbackItem';

export const metadata: Metadata = { title: '意見箱（後台）' };

const LIST_LIMIT = 100;

type Row = {
  id: number;
  body: string;
  is_read: boolean;
  created_at: string;
  profiles: { nickname: string | null } | null;
};

export default async function AdminFeedbackPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('feedback')
    .select('id, body, is_read, created_at, profiles(nickname)')
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw new Error(`讀取意見失敗：${error.message}`);

  const entries: FeedbackEntry[] = ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    body: row.body,
    isRead: row.is_read,
    createdAt: row.created_at,
    nickname: row.profiles?.nickname ?? '（未設定）',
  }));
  const unreadCount = entries.filter((e) => !e.isRead).length;

  return (
    <section className="wrap-medium space-y-8 pb-8 pt-12 md:pt-20">
      <div>
        <p className="eyebrow">Feedback</p>
        <h1 className="mt-4 font-serif text-5xl font-black tracking-wide md:text-6xl">意見箱</h1>
        <p className="mt-4 text-sm text-muted">
          <Link href="/admin" className="text-accent underline underline-offset-4">
            回後台
          </Link>
          ・共 {entries.length} 則，{unreadCount} 則未讀
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="card px-6 py-14 text-center text-muted">還沒有人留意見</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <FeedbackItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
}

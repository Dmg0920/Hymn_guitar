import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { BOOK_LABELS, SONG_COLUMNS, STATUS_LABELS, type Song } from '@/lib/songs';
import { createClient } from '@/lib/supabase/server';
import { escapeLikePattern, parseSongCode } from '@/lib/validation';
import { AdminSongRow, type Requester } from './AdminSongRow';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = { title: '後台' };

const LIST_LIMIT = 50;

const VIEWS = {
  queue: '待處理',
  practicing: STATUS_LABELS.practicing,
  uploaded: STATUS_LABELS.uploaded,
  declined: STATUS_LABELS.declined,
} as const;
type View = keyof typeof VIEWS;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export default async function AdminPage({ searchParams }: PageProps<'/admin'>) {
  await requireAdmin();
  const params = await searchParams;
  const rawView = first(params.view);
  const view: View = Object.hasOwn(VIEWS, rawView) ? (rawView as View) : 'queue';
  const q = first(params.q).trim();
  const qBook = first(params.book);

  const supabase = await createClient();
  let query = supabase.from('songs').select(SONG_COLUMNS).limit(LIST_LIMIT);

  if (q) {
    // 搜尋任何一首歌（包含沒人點過的），用來標記自己主動上傳的歌
    if (qBook === 'hymn' || qBook === 'supplement') {
      const code = parseSongCode(qBook, q);
      query = query.eq('book', qBook).eq('code', code.ok ? code.value : '__none__');
    } else {
      query = query.ilike('title', `%${escapeLikePattern(q)}%`).order('sort_key', { ascending: true });
    }
  } else if (view === 'queue') {
    query = query
      .eq('status', 'open')
      .gt('request_count', 0)
      .order('request_count', { ascending: false })
      .order('last_requested_at', { ascending: false });
  } else if (view === 'uploaded') {
    query = query.eq('status', 'uploaded').order('uploaded_at', { ascending: false });
  } else {
    query = query.eq('status', view).order('request_count', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(`讀取歌曲失敗：${error.message}`);
  const songs = (data ?? []) as Song[];
  const requesters = await loadRequesters(songs.map((s) => s.id));
  const unreadFeedback = await countUnreadFeedback();

  return (
    <section className="wrap-medium space-y-8 pb-8 pt-12 md:pt-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-4 font-serif text-5xl font-black tracking-wide md:text-6xl">後台</h1>
        </div>
        <Link href="/admin/feedback" className="btn-ghost min-h-11 px-5 text-sm">
          意見箱
          {unreadFeedback > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">
              {unreadFeedback}
            </span>
          )}
        </Link>
      </div>

      <form className="card flex flex-wrap gap-2 p-3" role="search">
        <select name="book" defaultValue={qBook || 'hymn'} aria-label="搜尋方式" className="input w-auto">
          <option value="hymn">{BOOK_LABELS.hymn}號碼</option>
          <option value="supplement">{BOOK_LABELS.supplement}號碼</option>
          <option value="title">歌名</option>
        </select>
        <input name="q" defaultValue={q} placeholder="找任何一首歌來編輯" aria-label="搜尋關鍵字" className="input min-w-0 flex-1" />
        <button type="submit" className="btn-primary min-h-12">
          搜尋
        </button>
      </form>

      {!q && (
        <nav aria-label="清單分類" className="flex flex-wrap gap-2 text-sm">
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <Link
              key={v}
              href={`/admin?view=${v}`}
              aria-current={v === view ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center rounded-full px-5 font-medium transition-colors duration-300 ${
                v === view ? 'bg-accent text-accent-ink' : 'border border-field bg-card hover:border-accent hover:text-accent'
              }`}
            >
              {VIEWS[v]}
            </Link>
          ))}
        </nav>
      )}

      {q && (
        <p className="text-sm text-muted">
          「{q}」的搜尋結果・
          <Link href="/admin" className="text-accent underline underline-offset-4">
            回到列表
          </Link>
        </p>
      )}

      {songs.length === 0 ? (
        <p className="card px-6 py-14 text-center text-muted">沒有歌曲</p>
      ) : (
        <ul className="space-y-3">
          {songs.map((song) => (
            <AdminSongRow key={song.id} song={song} requesters={requesters.get(song.id) ?? []} />
          ))}
        </ul>
      )}

      <ResetPasswordForm />
    </section>
  );
}

/**
 * 未讀意見數。意見箱的 migration（0004）可能還沒執行：此時退回 0，不要讓整個後台掛掉。
 */
async function countUnreadFeedback(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);
  if (error) {
    console.error('countUnreadFeedback failed', error);
    return 0;
  }
  return count ?? 0;
}

async function loadRequesters(songIds: number[]): Promise<Map<number, Requester[]>> {
  const result = new Map<number, Requester[]>();
  if (songIds.length === 0) return result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('requests')
    .select('song_id, message, created_at, profiles(nickname)')
    .in('song_id', songIds)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`讀取點歌者失敗：${error.message}`);

  type Row = { song_id: number; message: string | null; created_at: string; profiles: { nickname: string | null } | null };
  for (const row of (data ?? []) as unknown as Row[]) {
    const list = result.get(row.song_id) ?? [];
    result.set(row.song_id, [
      ...list,
      { nickname: row.profiles?.nickname ?? '（未設定）', message: row.message, createdAt: row.created_at },
    ]);
  }
  return result;
}

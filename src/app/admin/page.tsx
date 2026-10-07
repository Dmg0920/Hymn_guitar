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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">後台</h1>

      <form className="card flex flex-wrap gap-2 p-3">
        <select name="book" defaultValue={qBook || 'hymn'} className="input w-auto">
          <option value="hymn">{BOOK_LABELS.hymn}號碼</option>
          <option value="supplement">{BOOK_LABELS.supplement}號碼</option>
          <option value="title">歌名</option>
        </select>
        <input name="q" defaultValue={q} placeholder="找任何一首歌來編輯" className="input min-w-0 flex-1" />
        <button type="submit" className="btn-primary">
          搜尋
        </button>
      </form>

      {!q && (
        <nav className="flex flex-wrap gap-2 text-sm">
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <Link
              key={v}
              href={`/admin?view=${v}`}
              className={`rounded-full px-4 py-1.5 ${v === view ? 'bg-accent text-accent-ink' : 'border border-line bg-card'}`}
            >
              {VIEWS[v]}
            </Link>
          ))}
        </nav>
      )}

      {q && (
        <p className="text-sm text-muted">
          「{q}」的搜尋結果・<Link href="/admin" className="text-accent">回到列表</Link>
        </p>
      )}

      {songs.length === 0 ? (
        <p className="card p-6 text-center text-muted">沒有歌曲</p>
      ) : (
        <ul className="space-y-3">
          {songs.map((song) => (
            <AdminSongRow key={song.id} song={song} requesters={requesters.get(song.id) ?? []} />
          ))}
        </ul>
      )}

      <ResetPasswordForm />
    </div>
  );
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

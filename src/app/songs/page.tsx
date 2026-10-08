import type { Metadata } from 'next';
import Link from 'next/link';
import { Reveal } from '@/components/Reveal';
import { SongCard } from '@/components/SongCard';
import { BOOK_LABELS, SONG_COLUMNS, type Song } from '@/lib/songs';
import {
  SONGS_PAGE_SIZE,
  buildSearchFilter,
  buildSongsHref,
  parseSongsQuery,
  summarizeCategories,
  type BookFilter,
  type SongsQuery,
} from '@/lib/songs-query';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: '已上傳',
  description: '所有已經上傳的詩歌，可以依詩歌本、補充本與分類瀏覽，或直接搜尋。',
};

const BOOK_TABS: { value: BookFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'hymn', label: BOOK_LABELS.hymn },
  { value: 'supplement', label: BOOK_LABELS.supplement },
  { value: 'other', label: BOOK_LABELS.other },
];

export default async function SongsPage({ searchParams }: PageProps<'/songs'>) {
  const parsed = parseSongsQuery(await searchParams);
  const supabase = await createClient();

  const categories = await loadCategories(supabase, parsed.book);
  // 網址帶了已經沒有上傳歌曲的分類時，當作沒選，避免空白清單配上對不上的下拉選單
  const category = categories.some((c) => c.name === parsed.category) ? parsed.category : '';
  const query: SongsQuery = { ...parsed, category };

  let request = supabase
    .from('songs')
    .select(SONG_COLUMNS, { count: 'exact' })
    .eq('status', 'uploaded')
    .order('uploaded_at', { ascending: false })
    .order('id', { ascending: false })
    .range((query.page - 1) * SONGS_PAGE_SIZE, query.page * SONGS_PAGE_SIZE - 1);
  if (query.book !== 'all') request = request.eq('book', query.book);
  if (query.category) request = request.eq('category', query.category);
  const searchFilter = buildSearchFilter(query.q);
  if (searchFilter) request = request.or(searchFilter);

  const { data, count, error } = await request;
  // 頁碼超出範圍時 PostgREST 會回 416；當成空結果處理，下面會顯示「沒有符合」並提供回到第一頁的連結
  if (error && error.code !== 'PGRST103') throw new Error(`讀取已上傳清單失敗：${error.message}`);
  const songs = (data ?? []) as Song[];
  const total = count ?? 0;
  const pageCount = Math.max(Math.ceil(total / SONGS_PAGE_SIZE), 1);
  const isFiltered = query.book !== 'all' || query.category !== '' || query.q !== '';

  return (
    <section className="wrap pb-8 pt-12 md:pt-20">
      <Reveal>
        <p className="eyebrow">Archive</p>
        <h1 className="mt-4 font-serif text-5xl font-black tracking-wide md:text-7xl">已上傳</h1>
        <p className="mt-5 max-w-md text-balance text-muted">
          錄過的詩歌都在這裡，點開就會到 IG 貼文。找不到想聽的？
          <Link href="/request" className="ml-1 text-accent underline underline-offset-4">
            去點歌
          </Link>
        </p>
      </Reveal>

      <nav aria-label="詩歌本" className="mt-10 flex flex-wrap gap-2 text-sm">
        {BOOK_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildSongsHref({ book: tab.value, q: query.q })}
            aria-current={tab.value === query.book ? 'page' : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-5 font-medium transition-colors duration-300 ${
              tab.value === query.book ? 'bg-accent text-accent-ink' : 'border border-field bg-card hover:border-accent hover:text-accent'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* 一般 GET 表單：不需要 JS 就能搜尋，網址也可以直接分享 */}
      <form action="/songs" role="search" className="card mt-4 flex flex-wrap gap-2 p-3">
        {query.book !== 'all' && <input type="hidden" name="book" value={query.book} />}
        {categories.length > 0 && (
          <select name="category" defaultValue={query.category} aria-label="分類" className="input w-full sm:w-auto sm:max-w-64">
            <option value="">全部分類</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}（{c.count}）
              </option>
            ))}
          </select>
        )}
        <input
          name="q"
          defaultValue={query.q}
          placeholder="搜尋號碼、歌名或分類"
          aria-label="搜尋號碼、歌名或分類"
          maxLength={40}
          className="input min-w-0 flex-1"
        />
        <button type="submit" className="btn-primary min-h-12">
          搜尋
        </button>
      </form>

      <p role="status" className="mt-6 text-sm text-muted">
        {isFiltered ? '符合的有 ' : '共 '}
        <span className="numeral text-xl font-medium text-ink">{total}</span> 首
        {isFiltered && (
          <>
            ・
            <Link href="/songs" className="text-accent underline underline-offset-4">
              清除篩選
            </Link>
          </>
        )}
      </p>

      {songs.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center gap-5 px-6 py-16 text-center">
          <p className="numeral text-6xl font-medium italic leading-none text-line-strong">♪</p>
          <p className="text-muted">{isFiltered ? '沒有符合的詩歌。' : '還沒有上傳的詩歌。'}</p>
          <Link href={isFiltered ? '/songs' : '/request'} className="btn-primary">
            {isFiltered ? '看全部已上傳' : '去點歌'}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6 md:gap-y-12">
          {songs.map((song) => (
            <li key={song.id}>
              <SongCard song={song} />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && <Pagination query={query} pageCount={pageCount} />}
    </section>
  );
}

/** 只有詩歌本／補充本有分類；同一本裡有上傳過的分類才列出來。 */
async function loadCategories(supabase: Awaited<ReturnType<typeof createClient>>, book: BookFilter) {
  if (book !== 'hymn' && book !== 'supplement') return [];
  const { data, error } = await supabase
    .from('songs')
    .select('category')
    .eq('status', 'uploaded')
    .eq('book', book)
    .order('sort_key', { ascending: true });
  if (error) {
    // 分類只是篩選的輔助，讀不到就先不提供，清單本身照常顯示
    console.error('SongsPage: loadCategories failed', error);
    return [];
  }
  return summarizeCategories(data ?? []);
}

function Pagination({ query, pageCount }: { query: SongsQuery; pageCount: number }) {
  const link = 'inline-flex min-h-11 items-center rounded-full border border-field bg-card px-5 text-sm font-medium transition-colors hover:border-accent hover:text-accent';
  const disabled = 'inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm text-muted opacity-50';

  return (
    <nav aria-label="分頁" className="mt-14 flex items-center justify-between gap-3">
      {query.page > 1 ? (
        <Link href={buildSongsHref({ ...query, page: query.page - 1 })} rel="prev" className={link}>
          ← 上一頁
        </Link>
      ) : (
        <span aria-hidden="true" className={disabled}>
          ← 上一頁
        </span>
      )}
      <p className="text-sm text-muted" aria-current="page">
        第 <span className="numeral text-lg font-medium text-ink">{query.page}</span> / {pageCount} 頁
      </p>
      {query.page < pageCount ? (
        <Link href={buildSongsHref({ ...query, page: query.page + 1 })} rel="next" className={link}>
          下一頁 →
        </Link>
      ) : (
        <span aria-hidden="true" className={disabled}>
          下一頁 →
        </span>
      )}
    </nav>
  );
}

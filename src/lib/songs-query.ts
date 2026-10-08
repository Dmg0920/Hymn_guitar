// /songs（已上傳清單）的網址參數：解析與組回網址。純函式，網址就是唯一的狀態。
import { parseSongCode } from './validation.ts';

export const SONGS_PAGE_SIZE = 24;
export const SEARCH_MAX = 40;

export type BookFilter = 'all' | 'hymn' | 'supplement' | 'other';
export const BOOK_FILTERS: readonly BookFilter[] = ['all', 'hymn', 'supplement', 'other'];

export type SongsQuery = { book: BookFilter; category: string; q: string; page: number };

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function parseSongsQuery(params: Params): SongsQuery {
  const rawBook = first(params.book);
  const book = (BOOK_FILTERS as readonly string[]).includes(rawBook) ? (rawBook as BookFilter) : 'all';
  // 分類只有詩歌本／補充本才有意義
  const category = book === 'hymn' || book === 'supplement' ? first(params.category).trim().slice(0, 60) : '';
  const q = first(params.q).trim().slice(0, SEARCH_MAX);
  const page = Number.parseInt(first(params.page), 10);
  return { book, category, q, page: Number.isInteger(page) && page > 0 ? page : 1 };
}

export function buildSongsHref(query: Partial<SongsQuery>): string {
  const search = new URLSearchParams();
  if (query.book && query.book !== 'all') search.set('book', query.book);
  if (query.category) search.set('category', query.category);
  if (query.q) search.set('q', query.q);
  if (query.page && query.page > 1) search.set('page', String(query.page));
  const text = search.toString();
  return text ? `/songs?${text}` : '/songs';
}

/**
 * 搜尋字串 → PostgREST `or` 篩選條件（比對歌名、分類，輸入像號碼時再比對號碼）。
 * `or()` 的語法用逗號、括號、引號分隔，LIKE 的 % _ \ 和 * 也有特殊意義，
 * 這些字元一律換成空白，避免使用者輸入改變篩選結構。
 */
export function buildSearchFilter(q: string): string | null {
  const safe = q.replace(/[%_\\*,()"]/g, ' ').replace(/\s+/g, ' ').trim();
  if (safe === '') return null;

  const filters = [`title.ilike.%${safe}%`, `category.ilike.%${safe}%`];
  const code = parseSongCode('hymn', safe);
  if (code.ok) filters.push(`code.eq.${code.value}`);
  return filters.join(',');
}

/** 依出現順序去重，並附上每個分類的歌數。 */
export function summarizeCategories(rows: readonly { category: string | null }[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const { category } of rows) {
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count }));
}

export type SongBook = 'hymn' | 'supplement' | 'other';
export type SongStatus = 'open' | 'practicing' | 'uploaded' | 'declined';

export type Song = {
  id: number;
  book: SongBook;
  code: string | null;
  title: string | null;
  category: string | null;
  status: SongStatus;
  post_url: string | null;
  thumbnail_url: string | null;
  uploaded_at: string | null;
  request_count: number;
};

export const SONG_COLUMNS =
  'id, book, code, title, category, status, post_url, thumbnail_url, uploaded_at, request_count';

export const LATEST_UPLOADS_LIMIT = 5;

export const BOOK_LABELS: Record<SongBook, string> = {
  hymn: '詩歌本',
  supplement: '補充本',
  other: '其他',
};

export const STATUS_LABELS: Record<SongStatus, string> = {
  open: '等待中',
  practicing: '練習中',
  uploaded: '已上傳',
  declined: '暫不接',
};

export const STATUS_ORDER: SongStatus[] = ['open', 'practicing', 'uploaded', 'declined'];

export function isSongStatus(value: unknown): value is SongStatus {
  return typeof value === 'string' && (STATUS_ORDER as string[]).includes(value);
}

/** 「詩歌本 384」「補充本 101」；其他類直接用歌名。 */
export function songHeading(song: Pick<Song, 'book' | 'code' | 'title'>): string {
  if (song.book === 'other') return song.title ?? '（未命名）';
  return `${BOOK_LABELS[song.book]} ${song.code}`;
}

/** 標題下的第二行：有歌名顯示歌名，否則顯示分類（詩歌本目前沒有歌名）。 */
export function songSubtitle(song: Pick<Song, 'book' | 'title' | 'category'>): string | null {
  if (song.book === 'other') return null;
  return song.title ?? song.category;
}

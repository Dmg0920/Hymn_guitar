// 純函式的輸入驗證，前後端共用（server action 一律再驗一次）。

export const NICKNAME_MAX = 20;
export const MESSAGE_MAX = 100;
export const TITLE_MAX = 50;
export const FEEDBACK_MAX = 500;
export const BIO_MAX = 150;
export const FAVORITES_MAX = 5;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6,10}$/;
const INSTAGRAM_PATTERN = /^[a-z0-9._]{1,30}$/;
const POST_URL_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
]);

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = <T>(error: string): Parsed<T> => ({ ok: false, error });

/** 全形數字轉半形，方便中文輸入法使用者。 */
export function toHalfWidthDigits(raw: string): string {
  return raw.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

export function parseUsername(raw: unknown): Parsed<string> {
  const value = String(raw ?? '').trim().toLowerCase();
  return USERNAME_PATTERN.test(value)
    ? ok(value)
    : fail('帳號需為 3–20 個英文小寫、數字或底線');
}

export function parsePassword(raw: unknown): Parsed<string> {
  const value = String(raw ?? '');
  if (value.length < PASSWORD_MIN) return fail(`密碼至少 ${PASSWORD_MIN} 個字元`);
  if (value.length > PASSWORD_MAX) return fail(`密碼最多 ${PASSWORD_MAX} 個字元`);
  return ok(value);
}

export function parseNickname(raw: unknown): Parsed<string> {
  const value = String(raw ?? '').trim();
  if (value.length === 0) return fail('請輸入暱稱');
  if (value.length > NICKNAME_MAX) return fail(`暱稱最多 ${NICKNAME_MAX} 個字`);
  return ok(value);
}

export function parseEmail(raw: unknown): Parsed<string> {
  const value = String(raw ?? '').trim().toLowerCase();
  return EMAIL_PATTERN.test(value) ? ok(value) : fail('Email 格式不正確');
}

export function parseOtp(raw: unknown): Parsed<string> {
  const value = toHalfWidthDigits(String(raw ?? '')).replace(/\s/g, '');
  return OTP_PATTERN.test(value) ? ok(value) : fail('請輸入信中的數字驗證碼');
}

export function parseOptionalText(raw: unknown, max: number, label: string): Parsed<string | null> {
  const value = String(raw ?? '').trim();
  if (value.length === 0) return ok(null);
  if (value.length > max) return fail(`${label}最多 ${max} 個字`);
  return ok(value);
}

export function parseFeedback(raw: unknown): Parsed<string> {
  const value = String(raw ?? '').trim();
  if (value.length === 0) return fail('請輸入想說的話');
  if (value.length > FEEDBACK_MAX) return fail(`意見最多 ${FEEDBACK_MAX} 個字`);
  return ok(value);
}

export function parseBio(raw: unknown): Parsed<string | null> {
  // 統一換行、最多連續一個空行，避免用大量換行撐開版面
  const value = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (value.length === 0) return ok(null);
  if (value.length > BIO_MAX) return fail(`自介最多 ${BIO_MAX} 個字`);
  return ok(value);
}

/** 接受「name」「@name」或 instagram.com/name 網址，統一成小寫的 name；空字串代表不填。 */
export function parseInstagram(raw: unknown): Parsed<string | null> {
  let value = String(raw ?? '').trim().toLowerCase();
  if (value.length === 0) return ok(null);

  const fromUrl = value.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)\/?(?:[?#].*)?$/);
  if (fromUrl) value = fromUrl[1];
  value = value.replace(/^@/, '');

  if (!INSTAGRAM_PATTERN.test(value) || value.endsWith('.')) {
    return fail('IG 帳號只能有英文字母、數字、底線和句點（最多 30 字）');
  }
  return ok(value);
}

/** 最愛詩歌的 song id 清單（保留順序）：最多 FAVORITES_MAX 首、不重複、都是正整數。 */
export function parseFavoriteIds(raw: unknown[]): Parsed<number[]> {
  const ids = raw.map((v) => Number(v));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) return fail('歌曲 ID 不正確');
  if (new Set(ids).size !== ids.length) return fail('最愛不能重複');
  if (ids.length > FAVORITES_MAX) return fail(`最愛最多 ${FAVORITES_MAX} 首`);
  return ok(ids);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 預計上傳日（<input type="date"> 的 YYYY-MM-DD）；空字串代表沒有預計日。 */
export function parseExpectedDate(raw: unknown): Parsed<string | null> {
  const value = String(raw ?? '').trim();
  if (value.length === 0) return ok(null);
  if (!DATE_PATTERN.test(value)) return fail('預計上傳日格式不正確');
  // 往返一次擋掉 2026-02-31 這種不存在的日期（月份超出範圍時 Date 是 Invalid Date）
  const date = new Date(`${value}T00:00:00Z`);
  const isRealDate = !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  return isRealDate ? ok(value) : fail('預計上傳日格式不正確');
}

/** 只接受 IG / YouTube 的 https 連結，避免 javascript: 之類的網址。 */
export function parsePostUrl(raw: unknown): Parsed<string | null> {
  const value = String(raw ?? '').trim();
  if (value.length === 0) return ok(null);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail('連結格式不正確');
  }
  if (url.protocol !== 'https:' || !POST_URL_HOSTS.has(url.hostname)) {
    return fail('請貼 Instagram 或 YouTube 的 https 連結');
  }
  return ok(url.toString());
}

/**
 * 正規化詩歌號碼：詩歌本接受「384」「附1」；補充本接受「101」「0101」。
 * 是否真的存在由資料庫查詢決定。
 */
export function parseSongCode(book: 'hymn' | 'supplement', raw: unknown): Parsed<string> {
  const value = toHalfWidthDigits(String(raw ?? '')).replace(/\s/g, '');
  const appendix = value.match(/^附(\d+)$/);
  if (book === 'hymn' && appendix) return ok(`附${Number(appendix[1])}`);
  if (/^\d{1,4}$/.test(value) && Number(value) > 0) return ok(String(Number(value)));
  return fail(book === 'hymn' ? '請輸入詩歌號碼（例如 384 或 附1）' : '請輸入補充本號碼（例如 101）');
}

/** 登入後導回的路徑，只允許站內相對路徑，防止 open redirect。 */
export function safeNextPath(raw: unknown): string {
  const value = String(raw ?? '');
  // 瀏覽器解析網址前會移除 tab / 換行，'\' 也會被當成 '/'，所以一律拒絕
  if (!value.startsWith('/') || /[\u0000-\u001f\u007f\\]/.test(value)) return '/';

  const base = 'http://same-origin.invalid';
  const url = new URL(value, base);
  if (url.origin !== base) return '/';
  return `${url.pathname}${url.search}${url.hash}`;
}

/** 給 PostgREST ilike 用：跳脫 % _ \ 這些萬用字元。 */
export function escapeLikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, (c) => `\\${c}`);
}

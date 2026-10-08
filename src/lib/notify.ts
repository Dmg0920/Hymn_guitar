import { songHeading, songSubtitle, type Song } from './songs.ts';

export type NewRequest = {
  created_at: string;
  message: string | null;
  songs: Pick<Song, 'id' | 'book' | 'code' | 'title' | 'category'> | null;
  profiles: { nickname: string | null } | null;
};

export type NewFeedback = {
  created_at: string;
  body: string;
  profiles: { nickname: string | null } | null;
};

// Telegram 單則訊息上限 4096 字。使用者輸入（暱稱、留言、意見）長度不可控，
// 所以每一段都設上限，最後再用 MESSAGE_LIMIT 兜底：超長會讓發送失敗，
// 而發送失敗不推進進度，會變成每天卡在同一批、永遠通知不出去。
const MAX_SONGS_LISTED = 25;
const MAX_NAMES_PER_SONG = 5;
const MAX_FEEDBACK_LISTED = 10;
const MESSAGE_SNIPPET = 40;
const FEEDBACK_SNIPPET = 100;
const MESSAGE_LIMIT = 4000;

/** 換行改空白、超過長度加「…」，讓每一則在訊息裡只佔一行。 */
function snippet(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function requestSection(rows: NewRequest[]): string[] {
  const bySong = new Map<number, { song: NonNullable<NewRequest['songs']>; names: string[] }>();
  for (const row of rows) {
    if (!row.songs) continue;
    const entry = bySong.get(row.songs.id) ?? { song: row.songs, names: [] };
    const who = row.profiles?.nickname ?? '（未設定）';
    entry.names.push(row.message ? `${who}「${snippet(row.message, MESSAGE_SNIPPET)}」` : who);
    bySong.set(row.songs.id, entry);
  }
  if (bySong.size === 0) return [];

  const groups = [...bySong.values()].sort((a, b) => b.names.length - a.names.length);
  const total = groups.reduce((n, g) => n + g.names.length, 0);

  const out = [`🎸 新增 ${total} 筆點歌（${groups.length} 首）`];
  for (const { song, names } of groups.slice(0, MAX_SONGS_LISTED)) {
    const subtitle = songSubtitle(song);
    const shown = names.slice(0, MAX_NAMES_PER_SONG).join('、');
    const rest = names.length > MAX_NAMES_PER_SONG ? `…等 ${names.length} 人` : '';
    out.push(`• ${songHeading(song)}${subtitle ? `（${subtitle}）` : ''}：${shown}${rest}`);
  }
  if (groups.length > MAX_SONGS_LISTED) out.push(`…還有 ${groups.length - MAX_SONGS_LISTED} 首，到後台查看`);
  return out;
}

function feedbackSection(rows: NewFeedback[]): string[] {
  if (rows.length === 0) return [];
  const out = [`💬 新增 ${rows.length} 則意見`];
  for (const row of rows.slice(0, MAX_FEEDBACK_LISTED)) {
    out.push(`• ${row.profiles?.nickname ?? '（未設定）'}：${snippet(row.body, FEEDBACK_SNIPPET)}`);
  }
  if (rows.length > MAX_FEEDBACK_LISTED) out.push(`…還有 ${rows.length - MAX_FEEDBACK_LISTED} 則，到意見箱查看`);
  return out;
}

/**
 * 把新點歌與新意見整理成一則純文字訊息（點歌依歌曲分組，點播人多的在前）。
 * 兩者都沒有時回傳 null，呼叫端就不用發訊息。
 * 刻意不用 Telegram 的 Markdown / HTML 模式：暱稱與內文是使用者輸入，免得要逐一跳脫。
 */
export function buildDigest(
  requests: NewRequest[],
  feedback: NewFeedback[],
  adminUrl: string,
): string | null {
  const requestLines = requestSection(requests);
  const feedbackLines = feedbackSection(feedback);
  if (requestLines.length === 0 && feedbackLines.length === 0) return null;

  const out: string[] = [];
  if (requestLines.length > 0) out.push(requestLines.join('\n'));
  if (feedbackLines.length > 0) out.push(feedbackLines.join('\n'));
  out.push(feedbackLines.length > 0 ? `${adminUrl}\n${adminUrl}/feedback` : adminUrl);

  const text = out.join('\n\n');
  return text.length > MESSAGE_LIMIT ? `${text.slice(0, MESSAGE_LIMIT - 1)}…` : text;
}

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('缺少 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) {
    // 不把 response 原文丟進 log 以外的地方；URL 內含 bot token，所以也不要印 URL。
    throw new Error(`Telegram sendMessage 失敗：HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
}

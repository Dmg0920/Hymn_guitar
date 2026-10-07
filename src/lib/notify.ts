import { songHeading, songSubtitle, type Song } from './songs.ts';

export type NewRequest = {
  created_at: string;
  message: string | null;
  songs: Pick<Song, 'id' | 'book' | 'code' | 'title' | 'category'> | null;
  profiles: { nickname: string | null } | null;
};

// Telegram 單則訊息上限 4096 字，留餘裕給標頭與連結。
const MAX_SONGS_LISTED = 25;

/**
 * 把一批新點歌整理成一則純文字訊息（依歌曲分組，點播人多的在前）。
 * 沒有新點歌時回傳 null，呼叫端就不用發訊息。
 * 刻意不用 Telegram 的 Markdown / HTML 模式：暱稱與留言是使用者輸入，免得要逐一跳脫。
 */
export function buildDigest(rows: NewRequest[], adminUrl: string): string | null {
  const bySong = new Map<number, { song: NonNullable<NewRequest['songs']>; lines: string[] }>();
  for (const row of rows) {
    if (!row.songs) continue;
    const entry = bySong.get(row.songs.id) ?? { song: row.songs, lines: [] };
    const who = row.profiles?.nickname ?? '（未設定）';
    entry.lines.push(row.message ? `${who}「${row.message}」` : who);
    bySong.set(row.songs.id, entry);
  }
  if (bySong.size === 0) return null;

  const groups = [...bySong.values()].sort((a, b) => b.lines.length - a.lines.length);
  const total = groups.reduce((n, g) => n + g.lines.length, 0);

  const out = [`🎸 新增 ${total} 筆點歌（${groups.length} 首）`, ''];
  for (const { song, lines } of groups.slice(0, MAX_SONGS_LISTED)) {
    const subtitle = songSubtitle(song);
    out.push(`• ${songHeading(song)}${subtitle ? `（${subtitle}）` : ''}：${lines.join('、')}`);
  }
  if (groups.length > MAX_SONGS_LISTED) out.push(`…還有 ${groups.length - MAX_SONGS_LISTED} 首，到後台查看`);
  out.push('', adminUrl);
  return out.join('\n');
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

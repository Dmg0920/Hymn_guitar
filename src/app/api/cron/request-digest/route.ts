import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { buildDigest, sendTelegram, telegramConfigured, type NewRequest } from '@/lib/notify';
import { createAdminClient } from '@/lib/supabase/admin';

const STATE_NAME = 'request_digest';

// Vercel Cron 會帶 `Authorization: Bearer $CRON_SECRET`（見 vercel.json）。
// 沒設 CRON_SECRET 時一律拒絕，避免這個端點變成任何人都能觸發的公開網址。
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
  if (!telegramConfigured()) {
    return Response.json({ error: '尚未設定 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID' }, { status: 503 });
  }

  const supabase = createAdminClient();

  const { data: state, error: stateError } = await supabase
    .from('notification_state')
    .select('last_sent_at')
    .eq('name', STATE_NAME)
    .single();
  if (stateError) {
    console.error('request-digest: 讀取 notification_state 失敗（0005 migration 執行了嗎？）', stateError);
    return Response.json({ error: 'state_unavailable' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('requests')
    .select('created_at, message, songs(id, book, code, title, category), profiles(nickname)')
    .gt('created_at', state.last_sent_at)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('request-digest: 讀取新點歌失敗', error);
    return Response.json({ error: 'query_failed' }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as NewRequest[];
  const text = buildDigest(rows, `${request.nextUrl.origin}/admin`);
  if (!text) return Response.json({ sent: false, count: 0 });

  // 先發訊息、成功後才推進進度：發送失敗會留到明天一起通知，不會漏。
  try {
    await sendTelegram(text);
  } catch (e) {
    console.error('request-digest: 發送失敗', e);
    return Response.json({ error: 'send_failed' }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from('notification_state')
    .update({ last_sent_at: rows[rows.length - 1].created_at })
    .eq('name', STATE_NAME);
  if (updateError) console.error('request-digest: 更新進度失敗（明天可能重複通知）', updateError);

  return Response.json({ sent: true, count: rows.length });
}

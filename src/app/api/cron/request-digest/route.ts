import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import {
  buildDigest,
  sendTelegram,
  telegramConfigured,
  type NewFeedback,
  type NewRequest,
} from '@/lib/notify';
import { createAdminClient } from '@/lib/supabase/admin';

// 點歌與意見箱各自記錄「通知到哪一筆」，互不影響。
const REQUESTS_STATE = 'request_digest';
const FEEDBACK_STATE = 'feedback_digest';

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

  const { data: requestState, error: stateError } = await supabase
    .from('notification_state')
    .select('last_sent_at')
    .eq('name', REQUESTS_STATE)
    .single();
  if (stateError) {
    console.error('request-digest: 讀取 notification_state 失敗（0005 migration 執行了嗎？）', stateError);
    return Response.json({ error: 'state_unavailable' }, { status: 500 });
  }

  // 意見箱的進度列由這裡第一次執行時建立（從當下算起），不需要另外跑 migration。
  // 這一輪先不通知意見，避免把部署前累積的舊意見一次全推出來。
  const { data: feedbackState, error: feedbackStateError } = await supabase
    .from('notification_state')
    .select('last_sent_at')
    .eq('name', FEEDBACK_STATE)
    .maybeSingle();
  if (feedbackStateError) {
    console.error('request-digest: 讀取意見箱進度失敗', feedbackStateError);
    return Response.json({ error: 'state_unavailable' }, { status: 500 });
  }
  if (!feedbackState) {
    const { error: initError } = await supabase
      .from('notification_state')
      .upsert({ name: FEEDBACK_STATE, last_sent_at: new Date().toISOString() }, { ignoreDuplicates: true });
    if (initError) console.error('request-digest: 建立意見箱進度失敗', initError);
  }

  const { data: requestData, error: requestError } = await supabase
    .from('requests')
    .select('created_at, message, songs(id, book, code, title, category), profiles(nickname)')
    .gt('created_at', requestState.last_sent_at)
    .order('created_at', { ascending: true });
  if (requestError) {
    console.error('request-digest: 讀取新點歌失敗', requestError);
    return Response.json({ error: 'query_failed' }, { status: 500 });
  }

  let feedbackRows: NewFeedback[] = [];
  if (feedbackState) {
    const { data, error } = await supabase
      .from('feedback')
      .select('created_at, body, profiles(nickname)')
      .gt('created_at', feedbackState.last_sent_at)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('request-digest: 讀取新意見失敗', error);
      return Response.json({ error: 'query_failed' }, { status: 500 });
    }
    feedbackRows = (data ?? []) as unknown as NewFeedback[];
  }

  const requestRows = (requestData ?? []) as unknown as NewRequest[];
  const text = buildDigest(requestRows, feedbackRows, `${request.nextUrl.origin}/admin`);
  if (!text) return Response.json({ sent: false, requests: 0, feedback: 0 });

  // 先發訊息、成功後才推進進度：發送失敗會留到下次一起通知，不會漏。
  try {
    await sendTelegram(text);
  } catch (e) {
    console.error('request-digest: 發送失敗', e);
    return Response.json({ error: 'send_failed' }, { status: 502 });
  }

  const advance = async (name: string, rows: { created_at: string }[]) => {
    if (rows.length === 0) return;
    const { error } = await supabase
      .from('notification_state')
      .update({ last_sent_at: rows[rows.length - 1].created_at })
      .eq('name', name);
    if (error) console.error(`request-digest: 更新進度失敗（${name}，下次可能重複通知）`, error);
  };
  await advance(REQUESTS_STATE, requestRows);
  await advance(FEEDBACK_STATE, feedbackRows);

  return Response.json({ sent: true, requests: requestRows.length, feedback: feedbackRows.length });
}

'use server';

import { getViewer } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { createClient } from '@/lib/supabase/server';
import { FEEDBACK_MAX, parseFeedback } from '@/lib/validation';

// submit_feedback() 以 raise exception 回傳的代碼
const RPC_ERRORS: Record<string, string> = {
  not_authenticated: '請先登入',
  nickname_required: '請先設定暱稱',
  feedback_empty: '請輸入想說的話',
  feedback_too_long: `意見最多 ${FEEDBACK_MAX} 個字`,
  rate_limited: '今天已經留了很多則，明天再來吧',
};

export async function submitFeedback(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: RPC_ERRORS.not_authenticated };
  if (!viewer.nickname) return { error: RPC_ERRORS.nickname_required };

  const body = parseFeedback(formData.get('body'));
  if (!body.ok) return { error: body.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_feedback', { p_body: body.value });
  if (error) {
    const known = RPC_ERRORS[error.message];
    if (!known) console.error('submitFeedback failed', error);
    return { error: known ?? '送出失敗，請稍後再試' };
  }

  return { success: '收到了，謝謝你！' };
}

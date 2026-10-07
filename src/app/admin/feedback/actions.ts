'use server';

import { refresh } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { createClient } from '@/lib/supabase/server';

function parseFeedbackId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function setFeedbackRead(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = parseFeedbackId(formData.get('feedback_id'));
  if (id === null) return { error: '意見 ID 不正確' };
  const isRead = formData.get('is_read') === 'true';

  const supabase = await createClient();
  // .select() 確認真的更新到一筆：被 RLS 擋掉時 PostgREST 不會報錯，只是 0 筆
  const { data, error } = await supabase.from('feedback').update({ is_read: isRead }).eq('id', id).select('id');
  if (error) {
    console.error('setFeedbackRead failed', error);
    return { error: '更新失敗' };
  }
  if (!data || data.length === 0) return { error: '找不到這則意見，可能已經被刪除了' };

  refresh();
  return {};
}

export async function deleteFeedback(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = parseFeedbackId(formData.get('feedback_id'));
  if (id === null) return { error: '意見 ID 不正確' };

  const supabase = await createClient();
  const { data, error } = await supabase.from('feedback').delete().eq('id', id).select('id');
  if (error) {
    console.error('deleteFeedback failed', error);
    return { error: '刪除失敗' };
  }
  if (!data || data.length === 0) return { error: '刪除失敗，這則意見可能已經被刪除了' };

  refresh();
  return { success: '已刪除' };
}

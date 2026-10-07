'use server';

import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { createClient } from '@/lib/supabase/server';
import { parseNickname, safeNextPath } from '@/lib/validation';

export async function saveNickname(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');

  const nickname = parseNickname(formData.get('nickname'));
  if (!nickname.ok) return { error: nickname.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ nickname: nickname.value })
    .eq('id', viewer.id);
  if (error) {
    console.error('saveNickname failed', error);
    return { error: '儲存失敗，請稍後再試' };
  }

  redirect(safeNextPath(formData.get('next')));
}

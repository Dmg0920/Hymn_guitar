'use server';

import { redirect } from 'next/navigation';
import { requireViewer, usernameToEmail } from '@/lib/auth';
import { AVATAR_BUCKET } from '@/lib/avatar';
import type { FormState } from '@/lib/form-state';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { parsePassword } from '@/lib/validation';

// 要與 DeleteAccountForm 的 CONFIRM_TEXT 一致（'use server' 檔案不能匯出常數）
const DELETE_CONFIRM_TEXT = '刪除';

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer('/me/settings');
  // 只有帳號密碼註冊的使用者有密碼；Email 驗證碼的使用者不需要
  if (!viewer.username) return { error: '你是用 Email 驗證碼登入的，沒有密碼可以更改' };

  const current = String(formData.get('current_password') ?? '');
  if (!current) return { error: '請輸入目前的密碼' };
  const next = parsePassword(formData.get('new_password'));
  if (!next.ok) return { error: next.error };
  if (next.value === current) return { error: '新密碼不能和目前的密碼一樣' };
  if (formData.get('confirm_password') !== next.value) return { error: '兩次輸入的新密碼不一致' };

  const supabase = await createClient();
  // 先用目前的密碼重新驗證：避免別人拿到沒登出的手機就能改掉密碼
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(viewer.username),
    password: current,
  });
  if (verifyError) return { error: '目前的密碼不正確' };

  const { error } = await supabase.auth.updateUser({ password: next.value });
  if (error) {
    if (error.code === 'weak_password') return { error: '密碼強度不足，請換一個' };
    console.error('changePassword failed', error);
    return { error: '更改失敗，請稍後再試' };
  }
  return { success: '密碼已更新' };
}

export async function deleteAccount(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer('/me/settings');
  if (formData.get('confirm') !== DELETE_CONFIRM_TEXT) {
    return { error: `請輸入「${DELETE_CONFIRM_TEXT}」確認` };
  }
  // 避免唯一的管理員不小心把後台一起刪掉
  if (viewer.isAdmin) return { error: '管理員帳號不能直接刪除，請先在資料庫取消管理員身分' };

  const supabase = await createClient();

  // 先清頭像檔案（用本人身分，受 storage policy 限制只能動自己的資料夾）
  const { data: files } = await supabase.storage.from(AVATAR_BUCKET).list(viewer.id);
  if (files && files.length > 0) {
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove(files.map((f) => `${viewer.id}/${f.name}`));
    if (error) console.error('deleteAccount: avatar cleanup failed', error);
  }

  // 刪除 auth 使用者會連帶刪掉 profile、點歌、最愛、意見（on delete cascade）
  const { error } = await createAdminClient().auth.admin.deleteUser(viewer.id);
  if (error) {
    console.error('deleteAccount failed', error);
    return { error: '刪除失敗，請稍後再試' };
  }

  // 帳號已不存在，signOut 的撤銷請求可能失敗，但本機 cookie 仍會被清掉
  await supabase.auth.signOut().catch(() => undefined);
  redirect('/');
}

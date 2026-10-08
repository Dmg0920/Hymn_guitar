'use server';

import { redirect } from 'next/navigation';
import { isUsernameEmail, usernameToEmail } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { createAdminClient } from '@/lib/supabase/admin';
import { passSignupGate } from '@/lib/signup-guard';
import { createClient } from '@/lib/supabase/server';
import {
  parseEmail,
  parseNickname,
  parseOtp,
  parsePassword,
  parseUsername,
  safeNextPath,
} from '@/lib/validation';

const GENERIC_ERROR = '發生錯誤，請稍後再試';

export async function signInWithPassword(_: FormState, formData: FormData): Promise<FormState> {
  const username = parseUsername(formData.get('username'));
  const password = parsePassword(formData.get('password'));
  if (!username.ok || !password.ok) return { error: '帳號或密碼錯誤' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username.value),
    password: password.value,
  });
  if (error) return { error: '帳號或密碼錯誤' };

  redirect(safeNextPath(formData.get('next')));
}

export async function signUpWithPassword(_: FormState, formData: FormData): Promise<FormState> {
  const username = parseUsername(formData.get('username'));
  if (!username.ok) return { error: username.error };
  const password = parsePassword(formData.get('password'));
  if (!password.ok) return { error: password.error };
  const nickname = parseNickname(formData.get('nickname'));
  if (!nickname.ok) return { error: nickname.error };

  // 驗證通過後、建立帳號前先檢查頻率（admin API 不受 Supabase 內建限制約束）
  const gate = await passSignupGate();
  if (!gate.ok) {
    return { error: gate.reason === 'rate_limited' ? '註冊太頻繁，請稍後再試' : GENERIC_ERROR };
  }

  const email = usernameToEmail(username.value);
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password: password.value,
    email_confirm: true,
    // username 放 app_metadata（只有 secret key 能寫），DB trigger 只信任這裡
    app_metadata: { username: username.value },
    user_metadata: { nickname: nickname.value },
  });
  if (createError) {
    if (createError.code === 'email_exists' || createError.code === 'user_already_exists') {
      return { error: '這個帳號已經有人使用' };
    }
    if (createError.code === 'weak_password') return { error: '密碼強度不足，請換一個' };
    console.error('signUpWithPassword: createUser failed', createError);
    return { error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: password.value,
  });
  if (signInError) {
    console.error('signUpWithPassword: signIn failed', signInError);
    return { error: '註冊成功，但自動登入失敗，請直接登入' };
  }

  redirect(safeNextPath(formData.get('next')));
}

export async function sendEmailOtp(_: FormState, formData: FormData): Promise<FormState> {
  const email = parseEmail(formData.get('email'));
  if (!email.ok) return { error: email.error };
  if (isUsernameEmail(email.value)) return { error: 'Email 格式不正確' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: { shouldCreateUser: true },
  });
  if (error) {
    if (error.status === 429) return { error: '寄信太頻繁，請稍等一分鐘再試' };
    console.error('sendEmailOtp failed', error);
    return { error: GENERIC_ERROR };
  }

  return { email: email.value, success: '驗證碼已寄出，請到信箱查看' };
}

export async function verifyEmailOtp(_: FormState, formData: FormData): Promise<FormState> {
  const email = parseEmail(formData.get('email'));
  if (!email.ok) return { error: email.error };
  const token = parseOtp(formData.get('token'));
  if (!token.ok) return { email: email.value, error: token.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.value,
    token: token.value,
    type: 'email',
  });
  if (error) return { email: email.value, error: '驗證碼錯誤或已過期' };

  // 新使用者還沒有暱稱，requireViewer 會把他導到 /onboarding。
  redirect(safeNextPath(formData.get('next')));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from './env';

/**
 * 使用 secret key 的管理用 client，會略過 RLS。
 * 只用在：帳號密碼註冊（建立免驗證信的使用者）、管理員重設密碼。
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error('缺少環境變數 SUPABASE_SECRET_KEY，請參考 .env.example');

  return createClient(supabaseUrl(), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

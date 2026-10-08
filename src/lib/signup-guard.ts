import 'server-only';
import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { clientIpFrom } from '@/lib/client-ip';
import { createAdminClient } from '@/lib/supabase/admin';

export type SignupGate = { ok: true } | { ok: false; reason: 'rate_limited' | 'error' };

/**
 * 註冊前的頻率檢查（register_signup_attempt RPC，見 0005 migration）。
 * 只存 IP 的 HMAC；檢查失敗（含 RPC 不存在）一律拒絕，不放行。
 */
export async function passSignupGate(): Promise<SignupGate> {
  const ip = clientIpFrom(await headers());
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('缺少環境變數 SUPABASE_SECRET_KEY，請參考 .env.example');
  const ipHash = createHmac('sha256', secret).update(ip).digest('hex');

  const { error } = await createAdminClient().rpc('register_signup_attempt', { p_ip_hash: ipHash });
  if (!error) return { ok: true };
  if (error.message === 'rate_limited') return { ok: false, reason: 'rate_limited' };
  console.error('passSignupGate: register_signup_attempt failed', error);
  return { ok: false, reason: 'error' };
}

/**
 * 取得請求的來源 IP。部署在 Vercel 時，x-forwarded-for 由 Vercel 覆寫（不會沿用用戶端自帶的值），
 * 第一段就是用戶端 IP。拿不到時回傳 'unknown'，所有這類請求會共用同一個額度桶。
 */
export function clientIpFrom(headers: Pick<Headers, 'get'>): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

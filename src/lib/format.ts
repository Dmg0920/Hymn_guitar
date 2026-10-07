// 日期一律用台北時區格式化：同一段文字在 server render 與瀏覽器 hydrate 時要完全一致，
// 不能依賴執行環境的時區（Vercel 是 UTC，會讓晚上的點播顯示成前一天）。
const TIME_ZONE = 'Asia/Taipei';

const FORMATS = {
  /** 10/6 */
  short: { month: 'numeric', day: 'numeric' },
  /** 2026/10/6 */
  full: { year: 'numeric', month: 'numeric', day: 'numeric' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export function formatDate(iso: string, style: keyof typeof FORMATS = 'full'): string {
  return new Date(iso).toLocaleDateString('zh-TW', { ...FORMATS[style], timeZone: TIME_ZONE });
}

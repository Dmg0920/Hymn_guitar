// 練習中歌曲的排隊順序與預計上傳日。純函式，不碰資料庫。
import { formatDate } from './format.ts';

export type EtaInfo =
  | { kind: 'none' }
  | { kind: 'upcoming'; date: string }
  | { kind: 'overdue'; date: string };

/** expectedAt、today 都是 YYYY-MM-DD；日期當天仍算「預計中」，過了才算延後。 */
export function describeEta(expectedAt: string | null, today: string): EtaInfo {
  if (!expectedAt) return { kind: 'none' };
  return expectedAt < today ? { kind: 'overdue', date: expectedAt } : { kind: 'upcoming', date: expectedAt };
}

export type QueueSong = { id: number; expected_at: string | null; request_count: number };

/**
 * 排隊順序：有預計上傳日的先、日期早的先；日期相同或都沒填的，點播人數多的先；最後以 id 固定順序。
 * 資料庫查詢（lib/queue.ts）的 order 要與這個一致。
 */
export function compareQueue(a: QueueSong, b: QueueSong): number {
  if (a.expected_at !== b.expected_at) {
    if (a.expected_at === null) return 1;
    if (b.expected_at === null) return -1;
    return a.expected_at < b.expected_at ? -1 : 1;
  }
  return b.request_count - a.request_count || a.id - b.id;
}

/** 已排好序的清單 → song id 對應 1 起算的名次。 */
export function rankById(queue: readonly { id: number }[]): Map<number, number> {
  return new Map(queue.map((song, index) => [song.id, index + 1]));
}

/** 給人看的預計日期說明。date 欄位沒有時區，固定當成台北當天顯示。 */
export function etaLabel(eta: EtaInfo): string {
  switch (eta.kind) {
    case 'none':
      return '預計上傳日待定';
    case 'upcoming':
      return `預計 ${formatDate(eta.date, 'short')} 上傳`;
    case 'overdue':
      return `原訂 ${formatDate(eta.date, 'short')}，稍有延後`;
  }
}

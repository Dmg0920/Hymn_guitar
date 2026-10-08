// 徽章不存資料庫，由統計即時算出來：改規則不用 migration，也不會有人手動灌水。

export type BadgeStats = {
  requestTotal: number;
  uploadedTotal: number;
  /** 加入時間（ISO） */
  joinedAt: string;
  hasAvatar: boolean;
  hasBio: boolean;
};

export type Badge = {
  id: string;
  label: string;
  /** 達成條件，未達成時當作提示 */
  hint: string;
  earned: boolean;
  /** 還沒達成時的進度，例如「3 / 10」；沒有進度概念的徽章為 null */
  progress: { current: number; target: number } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function counted(id: string, label: string, hint: string, current: number, target: number): Badge {
  return { id, label, hint, earned: current >= target, progress: { current: Math.min(current, target), target } };
}

export function computeBadges(stats: BadgeStats, now: Date = new Date()): Badge[] {
  const memberDays = Math.max(0, Math.floor((now.getTime() - new Date(stats.joinedAt).getTime()) / DAY_MS));
  return [
    counted('first-request', '第一聲', '點第 1 首歌', stats.requestTotal, 1),
    counted('regular', '常客', '累積點 10 首歌', stats.requestTotal, 10),
    counted('devoted', '鐵粉', '累積點 50 首歌', stats.requestTotal, 50),
    counted('wish-granted', '心願達成', '點的歌被上傳 1 首', stats.uploadedTotal, 1),
    counted('kindred', '知音', '點的歌被上傳 5 首', stats.uploadedTotal, 5),
    {
      id: 'complete-profile',
      label: '自我介紹',
      hint: '設定頭像與自介',
      earned: stats.hasAvatar && stats.hasBio,
      progress: { current: Number(stats.hasAvatar) + Number(stats.hasBio), target: 2 },
    },
    counted('one-year', '同行一年', '加入滿 365 天', memberDays, 365),
  ];
}

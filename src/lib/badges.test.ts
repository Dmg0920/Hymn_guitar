import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBadges, type BadgeStats } from './badges.ts';

const NOW = new Date('2026-10-07T00:00:00Z');
const base: BadgeStats = { requestTotal: 0, uploadedTotal: 0, joinedAt: '2026-10-06T00:00:00Z', hasAvatar: false, hasBio: false };
const earned = (stats: BadgeStats) => computeBadges(stats, NOW).filter((b) => b.earned).map((b) => b.id);

test('新使用者沒有任何徽章，進度從 0 開始', () => {
  assert.deepEqual(earned(base), []);
  const regular = computeBadges(base, NOW).find((b) => b.id === 'regular');
  assert.deepEqual(regular?.progress, { current: 0, target: 10 });
});

test('點歌數與被上傳數依門檻取得徽章，進度不會超過目標', () => {
  assert.deepEqual(earned({ ...base, requestTotal: 10, uploadedTotal: 1 }), ['first-request', 'regular', 'wish-granted']);
  const all = computeBadges({ ...base, requestTotal: 80, uploadedTotal: 9 }, NOW);
  assert.deepEqual(all.find((b) => b.id === 'devoted')?.progress, { current: 50, target: 50 });
  assert.equal(all.find((b) => b.id === 'kindred')?.earned, true);
});

test('自我介紹徽章要頭像與自介都有；同行一年看加入天數', () => {
  assert.equal(earned({ ...base, hasAvatar: true }).includes('complete-profile'), false);
  assert.deepEqual(
    computeBadges({ ...base, hasAvatar: true }, NOW).find((b) => b.id === 'complete-profile')?.progress,
    { current: 1, target: 2 },
  );
  assert.equal(earned({ ...base, hasAvatar: true, hasBio: true }).includes('complete-profile'), true);
  assert.equal(earned({ ...base, joinedAt: '2025-10-07T00:00:00Z' }).includes('one-year'), true);
  assert.equal(earned({ ...base, joinedAt: '2025-10-08T00:00:00Z' }).includes('one-year'), false);
});

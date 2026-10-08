import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareQueue, describeEta, etaLabel, rankById, type QueueSong } from './schedule.ts';

const song = (id: number, expected_at: string | null, request_count: number): QueueSong => ({ id, expected_at, request_count });

test('describeEta：沒填、當天與之後、已過期', () => {
  assert.deepEqual(describeEta(null, '2026-10-08'), { kind: 'none' });
  assert.deepEqual(describeEta('2026-10-08', '2026-10-08'), { kind: 'upcoming', date: '2026-10-08' });
  assert.deepEqual(describeEta('2026-10-15', '2026-10-08'), { kind: 'upcoming', date: '2026-10-15' });
  assert.deepEqual(describeEta('2026-10-07', '2026-10-08'), { kind: 'overdue', date: '2026-10-07' });
});

test('compareQueue：有日期的先、日期早的先；其餘依點播數，最後依 id', () => {
  const queue = [song(1, null, 9), song(2, '2026-10-20', 1), song(3, '2026-10-10', 1), song(4, null, 12), song(5, '2026-10-10', 5), song(6, null, 9)];
  const ids = [...queue].sort(compareQueue).map((s) => s.id);
  assert.deepEqual(ids, [5, 3, 2, 4, 1, 6]);
});

test('rankById：名次從 1 起算', () => {
  assert.deepEqual([...rankById([{ id: 7 }, { id: 3 }])], [[7, 1], [3, 2]]);
});

test('etaLabel：三種狀態的文字', () => {
  assert.equal(etaLabel({ kind: 'none' }), '預計上傳日待定');
  assert.equal(etaLabel({ kind: 'upcoming', date: '2026-10-15' }), '預計 10/15 上傳');
  assert.equal(etaLabel({ kind: 'overdue', date: '2026-10-07' }), '原訂 10/7，稍有延後');
});

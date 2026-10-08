import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDigest, type NewFeedback, type NewRequest } from './notify.ts';

const song = (id: number, code: string) => ({ id, book: 'hymn' as const, code, title: null, category: '讚美' });
const row = (s: ReturnType<typeof song> | null, nickname: string | null, message: string | null = null): NewRequest => ({
  created_at: '2026-10-07T10:00:00Z',
  message,
  songs: s,
  profiles: { nickname },
});
const fb = (nickname: string | null, body: string): NewFeedback => ({
  created_at: '2026-10-07T10:00:00Z',
  body,
  profiles: { nickname },
});

test('沒有新點歌也沒有新意見時回傳 null', () => {
  assert.equal(buildDigest([], [], 'https://x/admin'), null);
  assert.equal(buildDigest([row(null, 'a')], [], 'https://x/admin'), null);
});

test('依歌曲分組、點播人多的在前，並帶上留言與後台連結', () => {
  const text = buildDigest(
    [row(song(1, '10'), '甲'), row(song(2, '384'), '乙', '想聽 capo 2'), row(song(2, '384'), '丙'), row(song(2, '384'), null)],
    [],
    'https://x/admin',
  )!;
  const lines = text.split('\n');
  assert.equal(lines[0], '🎸 新增 4 筆點歌（2 首）');
  assert.equal(lines[1], '• 詩歌本 384（讚美）：乙「想聽 capo 2」、丙、（未設定）');
  assert.equal(lines[2], '• 詩歌本 10（讚美）：甲');
  assert.equal(lines.at(-1), 'https://x/admin');
  assert.ok(!text.includes('💬'));
});

test('只有新意見時也會發，附意見箱連結、換行壓成一行', () => {
  const text = buildDigest([], [fb('小明', '網站很好用\n\n希望能加搜尋'), fb(null, '謝謝')], 'https://x/admin')!;
  const lines = text.split('\n');
  assert.equal(lines[0], '💬 新增 2 則意見');
  assert.equal(lines[1], '• 小明：網站很好用 希望能加搜尋');
  assert.equal(lines[2], '• （未設定）：謝謝');
  assert.equal(lines.at(-1), 'https://x/admin/feedback');
  assert.ok(!text.includes('🎸'));
});

test('點歌與意見同時存在時合成一則', () => {
  const text = buildDigest([row(song(1, '10'), '甲')], [fb('小明', '你好')], 'https://x/admin')!;
  assert.ok(text.indexOf('🎸') < text.indexOf('💬'));
  assert.equal(text.match(/https:\/\/x\/admin\n/g)?.length, 1);
});

test('歌太多時截斷並提示，維持在 Telegram 的字數上限內', () => {
  const rows = Array.from({ length: 200 }, (_, i) => row(song(i + 1, String(i + 1)), '長暱稱'.repeat(5), '留言'.repeat(40)));
  const text = buildDigest(rows, [], 'https://x/admin')!;
  assert.match(text, /…還有 175 首，到後台查看/);
  assert.ok(text.length < 4096, `訊息 ${text.length} 字`);
});

test('同一首被大量使用者點、意見很多很長時，仍在上限內（否則發送失敗會永遠卡住）', () => {
  const crowd = Array.from({ length: 300 }, (_, i) => row(song(1, '384'), `使用者${i}`.padEnd(20, '名'), '留'.repeat(100)));
  const feedback = Array.from({ length: 50 }, () => fb('暱'.repeat(20), '意'.repeat(500)));
  const text = buildDigest(crowd, feedback, 'https://x/admin')!;
  assert.match(text, /…等 300 人/);
  assert.match(text, /…還有 40 則，到意見箱查看/);
  assert.ok(text.length <= 4096, `訊息 ${text.length} 字`);
});

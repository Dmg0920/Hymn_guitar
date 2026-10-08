import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDigest, type NewRequest } from './notify.ts';

const song = (id: number, code: string) => ({ id, book: 'hymn' as const, code, title: null, category: '讚美' });
const row = (s: ReturnType<typeof song> | null, nickname: string | null, message: string | null = null): NewRequest => ({
  created_at: '2026-10-07T10:00:00Z',
  message,
  songs: s,
  profiles: { nickname },
});

test('沒有新點歌時回傳 null', () => {
  assert.equal(buildDigest([], 'https://x/admin'), null);
  assert.equal(buildDigest([row(null, 'a')], 'https://x/admin'), null);
});

test('依歌曲分組、點播人多的在前，並帶上留言與後台連結', () => {
  const text = buildDigest(
    [row(song(1, '10'), '甲'), row(song(2, '384'), '乙', '想聽 capo 2'), row(song(2, '384'), '丙'), row(song(2, '384'), null)],
    'https://x/admin',
  )!;
  const lines = text.split('\n');
  assert.equal(lines[0], '🎸 新增 4 筆點歌（2 首）');
  assert.equal(lines[2], '• 詩歌本 384（讚美）：乙「想聽 capo 2」、丙、（未設定）');
  assert.equal(lines[3], '• 詩歌本 10（讚美）：甲');
  assert.equal(lines.at(-1), 'https://x/admin');
});

test('歌太多時截斷並提示，維持在 Telegram 的字數上限內', () => {
  const rows = Array.from({ length: 200 }, (_, i) => row(song(i + 1, String(i + 1)), '長暱稱'.repeat(5), '留言'.repeat(40)));
  const text = buildDigest(rows, 'https://x/admin')!;
  assert.match(text, /…還有 175 首，到後台查看/);
  assert.ok(text.length < 4096, `訊息 ${text.length} 字`);
});

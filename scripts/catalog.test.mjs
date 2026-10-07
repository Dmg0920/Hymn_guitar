import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHymns, parseSupplement, toSeedSql } from './catalog.mjs';

const read = (name) => readFileSync(new URL(`../data/raw/${name}`, import.meta.url), 'utf8');

test('詩歌本目錄涵蓋 1–780 與附 1–6，沒有缺號', () => {
  const hymns = parseHymns(read('hymns.txt'));
  const expected = [
    ...Array.from({ length: 780 }, (_, i) => String(i + 1)),
    ...Array.from({ length: 6 }, (_, i) => `附${i + 1}`),
  ];
  assert.deepEqual(hymns.map((h) => h.code).sort(), expected.sort());
});

test('詩歌本分類為「大分類・小分類」', () => {
  const hymns = parseHymns(read('hymns.txt'));
  const byCode = Object.fromEntries(hymns.map((h) => [h.code, h]));
  assert.equal(byCode['384'].category, '經歷基督・作食物');
  assert.equal(byCode['1'].category, '頌讚三一神・祂的計劃');
  assert.equal(byCode['附3'].category, '附・福音－宇宙的奧秘');
  assert.equal(byCode['384'].title, null);
});

test('補充本 513 首，號碼去掉前導零，各分類號碼連續', () => {
  const songs = parseSupplement(read('supplement.txt'));
  assert.equal(songs.length, 513);

  const ranges = [
    [1, 37], [101, 150], [201, 258], [301, 349], [401, 470], [501, 543],
    [601, 629], [701, 762], [801, 880], [901, 930], [1001, 1005],
  ];
  const expected = ranges.flatMap(([from, to]) =>
    Array.from({ length: to - from + 1 }, (_, i) => String(from + i)),
  );
  assert.deepEqual(songs.map((s) => s.code), expected);
});

test('補充本解析歌名與分類，接受全形空白', () => {
  const songs = parseSupplement('讚美的話\n0022　 耶穌為王\n0029 讚美“獅子羔羊”\n');
  assert.deepEqual(songs, [
    { book: 'supplement', code: '22', title: '耶穌為王', category: '讚美的話', sortKey: 22 },
    { book: 'supplement', code: '29', title: '讚美“獅子羔羊”', category: '讚美的話', sortKey: 29 },
  ]);
});

test('重複號碼會拋錯', () => {
  assert.throws(() => parseSupplement('分類\n0001 甲\n0001 乙\n'), /重複/);
  assert.throws(() => parseHymns('分類\n小 1 2\n另一 2\n'), /重複/);
});

test('seed SQL 會跳脫單引號', () => {
  const sql = toSeedSql([
    { book: 'supplement', code: '1', title: "It's", category: 'A', sortKey: 1 },
  ]);
  assert.match(sql, /'It''s'/);
});

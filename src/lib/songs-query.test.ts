import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchFilter, buildSongsHref, parseSongsQuery, summarizeCategories } from './songs-query.ts';

test('parseSongsQuery：預設值與不合法參數', () => {
  assert.deepEqual(parseSongsQuery({}), { book: 'all', category: '', q: '', page: 1 });
  assert.deepEqual(parseSongsQuery({ book: 'evil', page: '-3', q: '  愛  ' }), { book: 'all', category: '', q: '愛', page: 1 });
  assert.equal(parseSongsQuery({ page: '2abc' }).page, 2);
  assert.equal(parseSongsQuery({ page: ['4', '5'] }).page, 4);
});

test('parseSongsQuery：分類只在詩歌本／補充本有效，搜尋字串有長度上限', () => {
  assert.equal(parseSongsQuery({ book: 'hymn', category: '讚美主' }).category, '讚美主');
  assert.equal(parseSongsQuery({ book: 'other', category: '讚美主' }).category, '');
  assert.equal(parseSongsQuery({ category: '讚美主' }).category, '');
  assert.equal(parseSongsQuery({ q: 'a'.repeat(100) }).q.length, 40);
});

test('buildSongsHref：預設值不進網址，其餘會編碼', () => {
  assert.equal(buildSongsHref({}), '/songs');
  assert.equal(buildSongsHref({ book: 'all', page: 1 }), '/songs');
  assert.equal(buildSongsHref({ book: 'hymn', category: '讚美主・祂的復活', page: 3 }), '/songs?book=hymn&category=%E8%AE%9A%E7%BE%8E%E4%B8%BB%E3%83%BB%E7%A5%82%E7%9A%84%E5%BE%A9%E6%B4%BB&page=3');
  const roundTrip = parseSongsQuery(Object.fromEntries(new URL(buildSongsHref({ book: 'supplement', q: '愛 &=' }), 'http://x').searchParams));
  assert.deepEqual(roundTrip, { book: 'supplement', category: '', q: '愛 &=', page: 1 });
});

test('buildSearchFilter：比對歌名與分類，像號碼時加比對號碼', () => {
  assert.equal(buildSearchFilter('愛'), 'title.ilike.%愛%,category.ilike.%愛%');
  assert.equal(buildSearchFilter('384'), 'title.ilike.%384%,category.ilike.%384%,code.eq.384');
  assert.equal(buildSearchFilter('附1'), 'title.ilike.%附1%,category.ilike.%附1%,code.eq.附1');
  assert.equal(buildSearchFilter('   '), null);
});

test('buildSearchFilter：會改變 or() 結構或 LIKE 語意的字元被拿掉', () => {
  assert.equal(buildSearchFilter('a,b)(c"d%e_f\\g*h'), 'title.ilike.%a b c d e f g h%,category.ilike.%a b c d e f g h%');
  assert.equal(buildSearchFilter('%_,'), null);
});

test('summarizeCategories：依出現順序去重並計數，略過沒有分類的', () => {
  const rows = [{ category: 'A' }, { category: 'B' }, { category: 'A' }, { category: null }];
  assert.deepEqual(summarizeCategories(rows), [{ name: 'A', count: 2 }, { name: 'B', count: 1 }]);
});

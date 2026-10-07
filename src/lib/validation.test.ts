import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FEEDBACK_MAX,
  escapeLikePattern,
  parseFeedback,
  parseNickname,
  parseOtp,
  parsePostUrl,
  parseSongCode,
  parseUsername,
  safeNextPath,
} from './validation.ts';

test('parseSongCode：詩歌本接受數字、附錄與全形數字', () => {
  assert.deepEqual(parseSongCode('hymn', ' 384 '), { ok: true, value: '384' });
  assert.deepEqual(parseSongCode('hymn', '３８４'), { ok: true, value: '384' });
  assert.deepEqual(parseSongCode('hymn', '附 1'), { ok: true, value: '附1' });
  assert.equal(parseSongCode('hymn', 'abc').ok, false);
  assert.equal(parseSongCode('hymn', '0').ok, false);
});

test('parseSongCode：補充本去掉前導零，不接受附錄', () => {
  assert.deepEqual(parseSongCode('supplement', '0101'), { ok: true, value: '101' });
  assert.deepEqual(parseSongCode('supplement', '1001'), { ok: true, value: '1001' });
  assert.equal(parseSongCode('supplement', '附1').ok, false);
});

test('parsePostUrl：只接受 IG / YouTube 的 https 連結', () => {
  assert.deepEqual(parsePostUrl(''), { ok: true, value: null });
  assert.equal(parsePostUrl('https://www.instagram.com/p/abc/').ok, true);
  assert.equal(parsePostUrl('https://youtu.be/xyz').ok, true);
  assert.equal(parsePostUrl('http://www.instagram.com/p/abc/').ok, false);
  assert.equal(parsePostUrl('javascript:alert(1)').ok, false);
  assert.equal(parsePostUrl('https://instagram.com.evil.example/p/1').ok, false);
});

test('safeNextPath：擋掉站外與 protocol-relative 網址', () => {
  assert.equal(safeNextPath('/request'), '/request');
  assert.equal(safeNextPath('//evil.example'), '/');
  assert.equal(safeNextPath('/\\evil.example'), '/');
  assert.equal(safeNextPath('https://evil.example'), '/');
  assert.equal(safeNextPath(null), '/');
  // 瀏覽器會先移除 tab / 換行，'/\t/evil' 會變成 '//evil'
  assert.equal(safeNextPath('/\t/evil.example'), '/');
  assert.equal(safeNextPath('/\n/evil.example'), '/');
  assert.equal(safeNextPath('/\t\\evil.example'), '/');
  assert.equal(safeNextPath('/request?x=1#top'), '/request?x=1#top');
});

test('parseUsername 轉小寫並檢查格式', () => {
  assert.deepEqual(parseUsername(' Moses_01 '), { ok: true, value: 'moses_01' });
  assert.equal(parseUsername('ab').ok, false);
  assert.equal(parseUsername('有中文').ok, false);
});

test('parseNickname / parseOtp', () => {
  assert.deepEqual(parseNickname('  小明 '), { ok: true, value: '小明' });
  assert.equal(parseNickname('   ').ok, false);
  assert.equal(parseNickname('一'.repeat(21)).ok, false);
  assert.deepEqual(parseOtp('１２３ ４５６'), { ok: true, value: '123456' });
  assert.equal(parseOtp('12ab56').ok, false);
});

test('escapeLikePattern 跳脫萬用字元', () => {
  assert.equal(escapeLikePattern('100%_\\'), '100\\%\\_\\\\');
});

test('parseFeedback：去頭尾空白、擋空白與過長', () => {
  assert.deepEqual(parseFeedback('  很好用！\n謝謝 '), { ok: true, value: '很好用！\n謝謝' });
  assert.equal(parseFeedback('').ok, false);
  assert.equal(parseFeedback('  \n ').ok, false);
  assert.equal(parseFeedback(null).ok, false);
  assert.equal(parseFeedback('一'.repeat(FEEDBACK_MAX)).ok, true);
  assert.equal(parseFeedback('一'.repeat(FEEDBACK_MAX + 1)).ok, false);
});

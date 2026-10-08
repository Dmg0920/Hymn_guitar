import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIpFrom } from './client-ip.ts';

test('clientIpFrom 取 x-forwarded-for 的第一段', () => {
  const h = new Headers({ 'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1' });
  assert.equal(clientIpFrom(h), '203.0.113.7');
});

test('clientIpFrom 沒有 x-forwarded-for 時用 x-real-ip', () => {
  assert.equal(clientIpFrom(new Headers({ 'x-real-ip': '198.51.100.2' })), '198.51.100.2');
});

test('clientIpFrom 都沒有時回傳 unknown', () => {
  assert.equal(clientIpFrom(new Headers()), 'unknown');
  assert.equal(clientIpFrom(new Headers({ 'x-forwarded-for': ' ' })), 'unknown');
});

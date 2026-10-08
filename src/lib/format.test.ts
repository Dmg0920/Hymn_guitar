import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayInTaipei } from './format.ts';

test('todayInTaipei：UTC 晚上 8 點之後已經是台北的隔天', () => {
  assert.equal(todayInTaipei(new Date('2026-10-08T15:59:00Z')), '2026-10-08');
  assert.equal(todayInTaipei(new Date('2026-10-08T16:00:00Z')), '2026-10-09');
});

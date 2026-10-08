import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUnseenUpload } from './notifications.ts';

test('isUnseenUpload：只有「已上傳且沒看過」才算未讀', () => {
  assert.equal(isUnseenUpload({ status: 'uploaded', seen_at: null }), true);
  assert.equal(isUnseenUpload({ status: 'uploaded', seen_at: '2026-10-08T00:00:00Z' }), false);
  assert.equal(isUnseenUpload({ status: 'practicing', seen_at: null }), false);
  assert.equal(isUnseenUpload({ status: 'open', seen_at: null }), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sniffAvatarType } from './avatar-type.ts';

const bytes = (...b: number[]) => new Uint8Array(b);

test('sniffAvatarType：用檔頭判斷 JPEG / PNG / WebP', () => {
  assert.deepEqual(sniffAvatarType(bytes(0xff, 0xd8, 0xff, 0xe0)), { mime: 'image/jpeg', ext: 'jpg' });
  assert.deepEqual(sniffAvatarType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), { mime: 'image/png', ext: 'png' });
  assert.deepEqual(
    sniffAvatarType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)),
    { mime: 'image/webp', ext: 'webp' },
  );
});

test('sniffAvatarType：其他格式（GIF、SVG、純文字、空檔）一律拒絕', () => {
  assert.equal(sniffAvatarType(new TextEncoder().encode('GIF89a')), null);
  assert.equal(sniffAvatarType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
  assert.equal(sniffAvatarType(bytes()), null);
  // RIFF 但不是 WEBP（例如 WAV）
  assert.equal(sniffAvatarType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45)), null);
});

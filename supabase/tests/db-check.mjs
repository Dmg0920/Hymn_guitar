import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// 用 PGlite（WASM Postgres）加上 Supabase auth / storage 的最小 stub，
// 驗證 migration、seed、RLS 與 request_song()。執行：pnpm test:db
const P = fileURLToPath(new URL('../..', import.meta.url));
const db = new PGlite();

// --- Supabase stubs ---
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  grant usage on schema public, auth, storage to anon, authenticated;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant all on storage.objects to authenticated;
  -- Supabase 預設會把 public schema 的表授權給 anon/authenticated，模擬這個預設
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);

await db.exec(readFileSync(`${P}supabase/migrations/0001_init.sql`, 'utf8'));
await db.exec(readFileSync(`${P}supabase/seed.sql`, 'utf8'));
await db.exec(readFileSync(`${P}supabase/seed.sql`, 'utf8')); // 可重複執行

const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const count = (await one(`select count(*)::int n, count(*) filter (where book='hymn')::int h from songs`));
assert.deepEqual(count, { n: 1299, h: 786 });
console.log('✓ migration + seed（兩次）成功，1299 首');

// --- users ---
// 模擬伺服器 createUser：username 在 app_metadata，nickname 在 user_metadata
const mk = async ({ username, nickname } = {}) => (await one(
  `insert into auth.users (raw_app_meta_data, raw_user_meta_data) values ($1, $2) returning id`,
  [username ? { username } : {}, nickname ? { nickname } : {}],
)).id;
const alice = await mk({ username: 'alice', nickname: '愛麗絲' });
const bob = await mk({});                               // email OTP 使用者，沒暱稱
const admin = await mk({ username: 'moses', nickname: '站長' });
const evil = await mk({ username: 'BAD NAME', nickname: 'x'.repeat(30) });
// 攻擊者透過公開 signup / OTP API 在 user_metadata 塞 username
const squatter = (await one(
  `insert into auth.users (raw_user_meta_data) values ($1) returning id`,
  [{ username: 'victim', nickname: '路人' }],
)).id;
assert.deepEqual(await one(`select username, nickname from profiles where id=$1`, [squatter]), { username: null, nickname: '路人' });
console.log('✓ user_metadata 裡的 username 不會被採用（防止搶帳號）');
await db.query(`update profiles set is_admin = true where id = $1`, [admin]);
assert.deepEqual(await one(`select username, nickname from profiles where id=$1`, [alice]), { username: 'alice', nickname: '愛麗絲' });
assert.deepEqual(await one(`select username, nickname from profiles where id=$1`, [evil]), { username: null, nickname: null });
console.log('✓ handle_new_user 建 profile，非法 metadata 變 null');

async function as(uid, fn) {
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
  try { return await fn(); } finally { await db.exec(`reset role`); }
}
const expectErr = async (p, re, label) => {
  await assert.rejects(p, re, label); console.log(`✓ ${label}`);
};

const s384 = (await one(`select id from songs where book='hymn' and code='384'`)).id;

// anon
await as(null, async () => {
  assert.equal((await one(`select count(*)::int n from songs`)).n, 1299);
  await expectErr(db.query(`select created_by from songs limit 1`), /permission denied/, 'anon 讀不到 songs.created_by');
  await expectErr(db.query(`select request_song($1)`, [s384]), /permission denied/, 'anon 不能點歌');
  await expectErr(db.query(`select count(*) from requests`), /permission denied/, 'anon 讀不到 requests');
  await expectErr(db.query(`select count(*) from profiles`), /permission denied/, 'anon 讀不到 profiles');
});

// bob 沒暱稱
await as(bob, () => expectErr(db.query(`select request_song($1)`, [s384]), /nickname_required/, '沒暱稱不能點歌'));
await as(bob, async () => {
  await expectErr(db.query(`update profiles set is_admin = true where id = $1`, [bob]), /permission denied/, '使用者不能把自己設成 admin');
  await db.query(`update profiles set nickname = '小柏' where id = $1`, [bob]);
  const r = await db.query(`update profiles set nickname = 'hack' where id = $1`, [alice]);
  assert.equal(r.affectedRows, 0); console.log('✓ 不能改別人的暱稱');
});

// 點歌
await as(alice, async () => {
  await db.query(`select request_song($1, null, $2)`, [s384, '想聽 capo 2']);
  await db.query(`select request_song($1, null, $2)`, [s384, null]); // 重複點：不新增、保留留言
  await expectErr(db.query(`insert into requests (user_id, song_id) values ($1, 1)`, [alice]), /permission denied/, '不能繞過 RPC 直接 insert requests');
  const upd = await db.query(`update songs set title='hacked' where id=$1`, [s384]);
  assert.equal(upd.affectedRows, 0);
  const del = await db.query(`delete from songs where id=$1`, [s384]);
  assert.equal(del.affectedRows, 0);
  await expectErr(db.query(`insert into songs (book, title) values ('other', 'x')`), /row-level/, '一般使用者不能新增 songs');
  console.log('✓ 一般使用者改 / 刪 songs 影響 0 筆');
  await db.query(`select request_song(null, $1)`, ['  主耶穌，我愛你！ ']);
  await expectErr(db.query(`select request_song(null, $1)`, ['！！']), /title_invalid/, '只有標點的歌名被擋');
  await expectErr(db.query(`select request_song(null, null, $1)`, ['x']), /song_required/, '沒指定歌被擋');
  await expectErr(db.query(`select request_song($1, null, $2)`, [s384, 'x'.repeat(101)]), /message_too_long/, '留言過長被擋');
});
await as(bob, async () => {
  await db.query(`select request_song(null, $1)`, ['主耶穌 我愛你']); // 正規化後同一首
  await db.query(`select request_song($1)`, [s384]);
  assert.equal((await one(`select count(*)::int n from requests`)).n, 2); console.log('✓ 只看得到自己的 requests');
  assert.equal((await one(`select count(*)::int n from profiles`)).n, 1); console.log('✓ 只看得到自己的 profile');
});
const other = await one(`select id, title, request_count from songs where book='other'`);
assert.equal(other.request_count, 2);
assert.equal((await one(`select count(*)::int n from songs where book='other'`)).n, 1);
console.log(`✓ 「其他」歌名正規化去重：「${other.title}」被 2 人點`);
const c384 = await one(`select request_count from songs where id=$1`, [s384]);
assert.equal(c384.request_count, 2);
assert.equal((await one(`select title from songs where id=$1`, [s384])).title, null);
assert.equal((await one(`select message from requests where user_id=$1 and song_id=$2`, [alice, s384])).message, '想聽 capo 2');
console.log('✓ request_count 正確、重複點歌保留原留言');

// 取消
await as(bob, () => db.query(`delete from requests where song_id=$1`, [s384]));
await as(bob, async () => {
  const r = await db.query(`delete from requests where user_id=$1`, [alice]);
  assert.equal(r.affectedRows, 0);
});
assert.equal((await one(`select request_count from songs where id=$1`, [s384])).request_count, 1);
console.log('✓ 取消點歌會扣回 request_count，不能刪別人的');

// admin
await as(admin, async () => {
  assert.equal((await one(`select count(*)::int n from requests`)).n, 3); // alice×2 + bob×1
  assert.equal((await one(`select count(*)::int n from profiles`)).n, 5);
  console.log('✓ admin 看得到所有 requests 與 profiles');
  await expectErr(db.query(`update songs set status='uploaded' where id=$1`, [s384]), /check constraint/, '已上傳一定要有連結與時間');
  await expectErr(db.query(`update songs set post_url='javascript:alert(1)' where id=$1`, [s384]), /check constraint/, 'post_url 一定要 https');
  await db.query(`update songs set status='uploaded', post_url='https://www.instagram.com/p/abc/', uploaded_at=now(), title='基督是我的食物' where id=$1`, [s384]);
  await db.query(`insert into storage.objects (bucket_id, name) values ('thumbnails', 'a.jpg')`);
  console.log('✓ admin 可以標記已上傳、上傳縮圖');
});
await as(alice, async () => {
  await expectErr(db.query(`select request_song($1)`, [s384]), /already_uploaded/, '已上傳的歌不能再點');
  await expectErr(db.query(`insert into storage.objects (bucket_id, name) values ('thumbnails', 'b.jpg')`), /row-level/, '一般使用者不能上傳縮圖');
});

// 重新跑 seed 不覆蓋 admin 補的歌名
await db.exec(readFileSync(`${P}supabase/seed.sql`, 'utf8'));
assert.equal((await one(`select title from songs where id=$1`, [s384])).title, '基督是我的食物');
console.log('✓ 重跑 seed 不會覆蓋後台補的歌名');

// rate limit
const carol = await mk({ username: 'carol', nickname: 'C' });
await as(carol, async () => {
  const ids = (await db.query(`select id from songs where book='supplement' order by id limit 11`)).rows.map((r) => r.id);
  for (const id of ids.slice(0, 10)) await db.query(`select request_song($1)`, [id]);
  await expectErr(db.query(`select request_song($1)`, [ids[10]]), /rate_limited/, '一天最多點 10 首');
  await db.query(`delete from requests where user_id = $1`, [carol]);
  await expectErr(db.query(`select request_song(null, $1)`, ['垃圾歌名']), /rate_limited/, '取消點歌不會重置每日上限');
  await expectErr(db.query(`select count(*) from request_log`), /permission denied/, '使用者碰不到 request_log');
});

console.log('\nALL SQL CHECKS PASSED');

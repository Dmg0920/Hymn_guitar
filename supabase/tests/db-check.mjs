import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// 用 PGlite（WASM Postgres）加上 Supabase auth / storage 的最小 stub，
// 驗證 migration、seed、RLS 與 request_song()。執行：pnpm test:db
const P = fileURLToPath(new URL('../..', import.meta.url));
const db = new PGlite();

// --- Supabase stubs ---
const STUBS = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  grant usage on schema public, auth, storage to anon, authenticated;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant all on storage.objects to authenticated;
  -- Supabase 預設會把 public schema 的表授權給 anon/authenticated，模擬這個預設
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`;
await db.exec(STUBS);

// 依檔名順序套用所有 migration（與在 SQL Editor 依序執行相同）
const migrationsDir = `${P}supabase/migrations`;
for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(`${migrationsDir}/${file}`, 'utf8'));
}
await db.exec(readFileSync(`${P}supabase/seed.sql`, 'utf8'));
await db.exec(readFileSync(`${P}supabase/seed.sql`, 'utf8')); // 可重複執行

const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const count = (await one(`select count(*)::int n, count(*) filter (where book='hymn')::int h from songs`));
assert.deepEqual(count, { n: 1299, h: 786 });
console.log('✓ migration + seed（兩次）成功，1299 首');

// --- users ---
// 模擬 GoTrue admin createUser 的實際順序（internal/api/admin.go adminUserCreate）：
// 先 INSERT（app_metadata 只有 provider），之後才 UPDATE 寫入呼叫端給的 app_metadata。
const mk = async ({ username, nickname } = {}) => {
  const { id } = await one(
    `insert into auth.users (raw_app_meta_data, raw_user_meta_data) values ($1, $2) returning id`,
    [{ provider: 'email', providers: ['email'] }, nickname ? { nickname } : {}],
  );
  if (username) {
    await db.query(
      `update auth.users set raw_app_meta_data = raw_app_meta_data || $2 where id = $1`,
      [id, { username }],
    );
  }
  return id;
};
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

// 意見箱（0004）：只能走 submit_feedback()，只有管理員讀得到
{
  const dave = await mk({ username: 'dave', nickname: 'D' });
  const noNick = await mk({ username: 'nonick' });
  await as(null, () => expectErr(db.query(`select submit_feedback($1)`, ['hi']), /permission denied/, 'anon 不能送意見'));
  await as(noNick, () => expectErr(db.query(`select submit_feedback($1)`, ['hi']), /nickname_required/, '沒暱稱不能送意見'));
  await as(dave, async () => {
    await expectErr(db.query(`select submit_feedback($1)`, ['  \n ']), /feedback_empty/, '空白意見被擋');
    await expectErr(db.query(`select submit_feedback($1)`, ['x'.repeat(501)]), /feedback_too_long/, '過長意見被擋');
    await db.query(`select submit_feedback($1)`, ['  網站很好用  ']);
    await expectErr(db.query(`insert into feedback (user_id, body) values ($1, 'x')`, [dave]), /permission denied/, '不能繞過 RPC 直接 insert feedback');
    assert.equal((await one(`select count(*)::int n from feedback`)).n, 0);
    console.log('✓ 一般使用者讀不到自己送出的意見（RLS 只開放管理員）');
  });
  await as(alice, async () => {
    // 有 table 權限但 RLS 只放行管理員：查不到、改 / 刪都影響 0 筆
    assert.equal((await one(`select count(*)::int n from feedback`)).n, 0);
    assert.equal((await db.query(`update feedback set is_read = true`)).affectedRows, 0);
    assert.equal((await db.query(`delete from feedback`)).affectedRows, 0);
    console.log('✓ 其他使用者看不到、改不了、刪不了意見');
  });
  await as(admin, async () => {
    const rows = (await db.query(`select body, is_read from feedback`)).rows;
    assert.deepEqual(rows, [{ body: '網站很好用', is_read: false }]);
    const upd = await db.query(`update feedback set is_read = true`);
    assert.equal(upd.affectedRows, 1);
    await expectErr(db.query(`update feedback set body = 'edited'`), /permission denied/, '管理員只能改已讀狀態、不能改內容');
    console.log('✓ admin 讀得到意見（已 trim）、可標已讀');
  });
  // 每日 5 則上限
  await as(dave, async () => {
    for (let i = 0; i < 4; i++) await db.query(`select submit_feedback($1)`, [`第 ${i + 2} 則`]);
    await expectErr(db.query(`select submit_feedback($1)`, ['第 6 則']), /rate_limited/, '一天最多 5 則意見');
  });
  await as(admin, async () => {
    const del = await db.query(`delete from feedback where user_id = $1`, [dave]);
    assert.equal(del.affectedRows, 5);
  });
  console.log('✓ 意見箱：RPC 驗證、RLS、每日上限、admin 可刪');
}

// 個人檔案（0006）：公開 / 私人、頭像路徑、最愛詩歌、頭像 storage
{
  const eve = await mk({ username: 'eve', nickname: '伊芙' });
  const frank = await mk({ username: 'frank', nickname: '法蘭克' });
  const noNick = await mk({ username: 'nonick2' });
  const songIds = (await db.query(`select id from songs where book='supplement' order by id limit 6`)).rows.map((r) => r.id);

  await as(eve, async () => {
    await db.query(`update profiles set bio = '喜歡慢板的詩歌', ig_handle = 'eve.sings' where id = $1`, [eve]);
    await expectErr(db.query(`update profiles set bio = $2 where id = $1`, [eve, 'x'.repeat(151)]), /check constraint/, '自介超過 150 字被擋');
    await expectErr(db.query(`update profiles set ig_handle = 'Bad Name!' where id = $1`, [eve]), /check constraint/, 'IG 帳號格式不對被擋');
    await expectErr(db.query(`update profiles set avatar_path = $2 where id = $1`, [eve, `${frank}/a.webp`]), /check constraint/, '頭像路徑不能指向別人的資料夾');
    await expectErr(db.query(`update profiles set avatar_path = $2 where id = $1`, [eve, `${eve}/../x.webp`]), /check constraint/, '頭像路徑不能含 ..');
    await db.query(`update profiles set avatar_path = $2 where id = $1`, [eve, `${eve}/1700000000.webp`]);
    await expectErr(db.query(`update profiles set username = 'hack' where id = $1`, [eve]), /permission denied/, '使用者不能改自己的 username');
    console.log('✓ 個人檔案欄位的 constraint 與欄位權限');
  });

  // 預設私人：anon 與其他人都看不到
  await as(null, async () => {
    assert.equal((await one(`select count(*)::int n from public_profiles`)).n, 0);
  });
  await as(frank, async () => {
    assert.equal((await one(`select count(*)::int n from public_profiles`)).n, 0);
  });
  console.log('✓ 預設私人：public_profiles 看不到任何人');

  // 最愛詩歌
  await as(eve, async () => {
    await db.query(`select set_favorites($1)`, [songIds.slice(0, 3)]);
    assert.deepEqual((await db.query(`select song_id from favorite_songs order by position`)).rows.map((r) => r.song_id), songIds.slice(0, 3));
    await db.query(`select set_favorites($1)`, [[songIds[2], songIds[0]]]); // 整份取代、保留順序
    assert.deepEqual((await db.query(`select song_id from favorite_songs order by position`)).rows.map((r) => r.song_id), [songIds[2], songIds[0]]);
    await expectErr(db.query(`select set_favorites($1)`, [songIds]), /too_many_favorites/, '最愛最多 5 首');
    await expectErr(db.query(`select set_favorites($1)`, [[songIds[0], songIds[0]]]), /duplicate_favorite/, '最愛不能重複');
    await expectErr(db.query(`select set_favorites($1)`, [[999999]]), /song_not_found/, '最愛的歌必須存在');
    await expectErr(db.query(`insert into favorite_songs (user_id, song_id, position) values ($1, $2, 1)`, [eve, songIds[4]]), /permission denied/, '不能繞過 RPC 直接寫 favorite_songs');
    assert.equal((await one(`select count(*)::int n from favorite_songs`)).n, 2); // 失敗的呼叫不影響原本的最愛
  });
  await as(noNick, () => expectErr(db.query(`select set_favorites($1)`, [[songIds[0]]]), /nickname_required/, '沒暱稱不能設最愛'));
  await as(null, () => expectErr(db.query(`select set_favorites($1)`, [[songIds[0]]]), /permission denied/, 'anon 不能設最愛'));
  await as(frank, async () => {
    assert.equal((await one(`select count(*)::int n from favorite_songs`)).n, 0);
    await expectErr(db.query(`delete from favorite_songs`), /permission denied/, '不能直接刪 favorite_songs');
  });
  await as(null, async () => assert.equal((await one(`select count(*)::int n from favorite_songs`)).n, 0));
  console.log('✓ set_favorites：整份取代、上限、不重複、私人檔案的最愛別人看不到');

  // 公開
  await as(eve, () => db.query(`update profiles set is_public = true where id = $1`, [eve]));
  await as(eve, async () => {
    await db.query(`select request_song($1)`, [songIds[0]]);
    await db.query(`select request_song($1)`, [songIds[1]]);
  });
  await as(null, async () => {
    const row = await one(`select * from public_profiles`);
    assert.deepEqual(
      { ...row, created_at: undefined },
      { id: eve, nickname: '伊芙', bio: '喜歡慢板的詩歌', avatar_path: `${eve}/1700000000.webp`, ig_handle: 'eve.sings', created_at: undefined, request_total: 2, uploaded_total: 0 },
    );
    assert.equal(Object.keys(row).includes('username'), false);
    assert.equal(Object.keys(row).includes('is_admin'), false);
    await expectErr(db.query(`select username from public_profiles`), /does not exist/, 'public_profiles 不含 username');
    await expectErr(db.query(`select count(*) from profiles`), /permission denied/, '公開檔案不代表能讀 profiles 表');
    assert.equal((await one(`select count(*)::int n from favorite_songs`)).n, 2);
    await expectErr(db.query(`select count(*) from requests`), /permission denied/, '公開檔案不會公開 requests');
  });
  await as(frank, async () => {
    assert.equal((await one(`select count(*)::int n from public_profiles`)).n, 1);
    assert.equal((await one(`select count(*)::int n from favorite_songs`)).n, 2);
    assert.equal((await one(`select count(*)::int n from profiles`)).n, 1); // 仍然只看得到自己的
    assert.equal((await one(`select count(*)::int n from requests`)).n, 0);
  });
  await as(eve, () => db.query(`update profiles set is_public = false where id = $1`, [eve]));
  await as(null, async () => {
    assert.equal((await one(`select count(*)::int n from public_profiles`)).n, 0);
    assert.equal((await one(`select count(*)::int n from favorite_songs`)).n, 0);
  });
  console.log('✓ 公開檔案：只暴露安全欄位與總數，改回私人立刻消失');

  // 頭像 storage：只能動自己的資料夾
  await as(eve, async () => {
    await db.query(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${eve}/a.webp`]);
    await expectErr(db.query(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${frank}/a.webp`]), /row-level/, '不能上傳到別人的頭像資料夾');
    await expectErr(db.query(`insert into storage.objects (bucket_id, name) values ('avatars', 'a.webp')`), /row-level/, '不能上傳到頭像 bucket 根目錄');
  });
  await as(frank, async () => {
    assert.equal((await one(`select count(*)::int n from storage.objects where bucket_id = 'avatars'`)).n, 0);
    assert.equal((await db.query(`delete from storage.objects where bucket_id = 'avatars'`)).affectedRows, 0);
  });
  await as(eve, async () => {
    assert.equal((await db.query(`delete from storage.objects where bucket_id = 'avatars'`)).affectedRows, 1);
  });
  console.log('✓ 頭像 storage：每人只能新增 / 讀 / 刪自己資料夾裡的檔案');

  // 刪除帳號：auth.users 刪除會連帶清掉 profile、點歌、最愛，並扣回 request_count
  const before = (await one(`select request_count from songs where id = $1`, [songIds[0]])).request_count;
  await as(eve, () => db.query(`select set_favorites($1)`, [[songIds[0]]]));
  await db.query(`delete from auth.users where id = $1`, [eve]);
  assert.equal((await one(`select count(*)::int n from profiles where id = $1`, [eve])).n, 0);
  assert.equal((await one(`select count(*)::int n from favorite_songs where user_id = $1`, [eve])).n, 0);
  assert.equal((await one(`select count(*)::int n from requests where user_id = $1`, [eve])).n, 0);
  assert.equal((await one(`select request_count from songs where id = $1`, [songIds[0]])).request_count, before - 1);
  console.log('✓ 刪除帳號會連帶清掉個人資料並扣回點播數');
}

// 點歌提醒（0005）：進度表只有 service_role（伺服器 secret key）碰得到
{
  const state = await one(`select name, last_sent_at from notification_state`);
  assert.equal(state.name, 'request_digest');
  for (const [label, uid] of [['anon', null], ['一般使用者', alice], ['管理員', admin]]) {
    await as(uid, async () => {
      await expectErr(db.query(`select * from notification_state`), /permission denied/, `${label}讀不到 notification_state`);
      await expectErr(db.query(`update notification_state set last_sent_at = now()`), /permission denied/, `${label}不能改 notification_state`);
    });
  }
  await db.exec(`set role service_role`);
  try {
    // 與 cron 端點相同的查詢：只拿進度之後的點歌，推進後就不會重複
    await db.query(`update notification_state set last_sent_at = $1`, ['2000-01-01T00:00:00Z']);
    const total = (await one(`select count(*)::int n from requests`)).n;
    const fresh = (await db.query(`select 1 from requests where created_at > (select last_sent_at from notification_state)`)).rows.length;
    assert.equal(fresh, total);
    await db.query(`update notification_state set last_sent_at = (select max(created_at) from requests)`);
    assert.equal((await db.query(`select 1 from requests where created_at > (select last_sent_at from notification_state)`)).rows.length, 0);
  } finally { await db.exec(`reset role`); }
  console.log('✓ 點歌提醒進度表：使用者與管理員 UI 都碰不到，service_role 可讀寫');
}

// 0002 的回填：模擬已經只跑過 0001、帳號 username 為空的正式資料庫
{
  const legacy = new PGlite();
  await legacy.exec(STUBS);
  await legacy.exec(readFileSync(`${migrationsDir}/0001_init.sql`, 'utf8'));
  const { id } = (await legacy.query(
    `insert into auth.users (raw_app_meta_data) values ($1) returning id`,
    [{ provider: 'email', providers: ['email'] }],
  )).rows[0];
  await legacy.query(`update auth.users set raw_app_meta_data = raw_app_meta_data || $2 where id = $1`, [id, { username: 'legacy' }]);
  assert.equal((await legacy.query(`select username from profiles`)).rows[0].username, null);
  await legacy.exec(readFileSync(`${migrationsDir}/0002_username_from_app_metadata.sql`, 'utf8'));
  assert.equal((await legacy.query(`select username from profiles`)).rows[0].username, 'legacy');
  console.log('✓ 0002 會補上只跑過 0001 時註冊的帳號 username');
}

console.log('\nALL SQL CHECKS PASSED');

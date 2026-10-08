-- 上傳通知與練習排程：
--   1. requests.seen_at：點歌的人「已看過這首上傳了」的時間。歌已上傳、seen_at 為空 = 未讀。
--   2. songs.expected_at：站長填的「預計上傳日」，只用在練習中的歌，公開顯示在首頁排程。
-- 在 Supabase Dashboard → SQL Editor 執行這一個檔案（結尾會自動 reload PostgREST schema cache）。
-- 部署順序：先執行這個 migration，再部署新版網站；否則登入後的頁面與後台會因為找不到欄位而讀取失敗。

------------------------------------------------------------
-- 1. 上傳通知（不寄信，只在網站內顯示未讀標記）
------------------------------------------------------------
alter table public.requests add column seen_at timestamptz;

-- 部署當下已經上傳的歌視為已讀，不要一次跳出一堆「新上傳」。
update public.requests r
set seen_at = now()
from public.songs s
where s.id = r.song_id and s.status = 'uploaded';

-- 使用者只能改自己那幾列的 seen_at（欄位層級授權：message、song_id 等一律不能改）。
grant update (seen_at) on public.requests to authenticated;

create policy "requests: mark own seen" on public.requests
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

------------------------------------------------------------
-- 2. 練習排程：預計上傳日
------------------------------------------------------------
alter table public.songs add column expected_at date;

-- songs 的讀取權限是欄位清單制（刻意排除 created_by），新欄位要明確加進去。
grant select (expected_at) on public.songs to anon, authenticated;

notify pgrst, 'reload schema';

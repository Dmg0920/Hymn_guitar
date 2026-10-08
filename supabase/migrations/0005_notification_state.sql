-- 點歌提醒：記錄上次已經通知到哪一筆點歌，避免每天重複通知同一批。
-- 在 Supabase Dashboard → SQL Editor 執行這一個檔案即可。
-- 只有伺服器的 secret key（service_role）讀寫，使用者與管理員 UI 都碰不到。

create table public.notification_state (
  name text primary key,
  last_sent_at timestamptz not null
);

-- 從現在開始算：部署當下已經存在的點歌不會被當成「新的」一次推給你。
insert into public.notification_state (name, last_sent_at) values ('request_digest', now());

alter table public.notification_state enable row level security;
revoke all on public.notification_state from anon, authenticated;

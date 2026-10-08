-- 帳號密碼註冊的頻率限制。註冊走 admin API（secret key），會略過 Supabase 內建的限制，
-- 所以由伺服器在 createUser 之前先呼叫 register_signup_attempt()：依 IP 與全站兩個維度計數。
-- 在 Supabase Dashboard → SQL Editor 執行這一個檔案，接著執行 `notify pgrst, 'reload schema';`。

-- 只存 IP 的 HMAC，不存原始 IP。資料只增不減，由 RPC 順手清掉一天前的紀錄。
create table public.signup_log (
  id bigint generated always as identity primary key,
  ip_hash text not null check (char_length(ip_hash) between 1 and 128),
  created_at timestamptz not null default now()
);

create index signup_log_ip_created_idx on public.signup_log (ip_hash, created_at desc);
create index signup_log_created_idx on public.signup_log (created_at desc);

------------------------------------------------------------
-- 註冊嘗試 RPC：檢查額度並記一筆（同一個 transaction，不會有檢查與寫入之間的空隙）
------------------------------------------------------------
-- 每個 IP 每小時 10 次、全站每小時 200 次。IG 內建瀏覽器的使用者常共用行動網路的出口 IP，
-- 所以單一 IP 的額度抓得比較寬；全站上限是擋分散式腳本的最後一道。
-- 輸入驗證失敗的請求不會走到這裡；帳號已被使用等失敗仍然計入，避免拿來探測帳號名稱。
create function public.register_signup_attempt(p_ip_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_ip_hourly_limit constant integer := 10;
  c_global_hourly_limit constant integer := 200;
begin
  if p_ip_hash is null or p_ip_hash = '' then
    raise exception 'invalid_ip';
  end if;

  -- 所有註冊嘗試依序處理，避免並行請求繞過上限
  perform pg_advisory_xact_lock(hashtext('signup'));

  delete from public.signup_log where created_at < now() - interval '1 day';

  if (select count(*) from public.signup_log
      where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= c_ip_hourly_limit
     or (select count(*) from public.signup_log
      where created_at > now() - interval '1 hour') >= c_global_hourly_limit then
    raise exception 'rate_limited';
  end if;

  insert into public.signup_log (ip_hash) values (p_ip_hash);
end;
$$;

------------------------------------------------------------
-- Grants & Row Level Security：只有伺服器端（service_role）能呼叫，使用者完全碰不到
------------------------------------------------------------
alter table public.signup_log enable row level security;

revoke all on public.signup_log from anon, authenticated;

revoke execute on function public.register_signup_attempt(text) from public, anon, authenticated;
grant execute on function public.register_signup_attempt(text) to service_role;

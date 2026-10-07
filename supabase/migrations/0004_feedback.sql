-- 意見箱：登入且有暱稱的使用者送出意見，只有管理員能讀、標記已讀、刪除。
-- 在 Supabase Dashboard → SQL Editor 執行這一個檔案即可。

create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index feedback_created_idx on public.feedback (created_at desc);
create index feedback_unread_idx on public.feedback (created_at desc) where not is_read;
create index feedback_user_created_idx on public.feedback (user_id, created_at desc);

------------------------------------------------------------
-- 送出意見 RPC：唯一能新增 feedback 的入口
------------------------------------------------------------
-- 每人 24 小時內最多 5 則。額度以 feedback 本身計算：管理員刪除某人的意見會讓他多出額度，
-- 但只有管理員能刪，可接受（不另外建 log 表）。
create function public.submit_feedback(p_body text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_daily_limit constant integer := 5;
  v_uid uuid := auth.uid();
  -- btrim() 只去半形空白，不去換行 / tab / 全形空白，所以用 regexp
  v_body text := regexp_replace(coalesce(p_body, ''), '^[[:space:]　]+|[[:space:]　]+$', '', 'g');
  v_id bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and nickname is not null) then
    raise exception 'nickname_required';
  end if;
  if v_body = '' then
    raise exception 'feedback_empty';
  end if;
  if char_length(v_body) > 500 then
    raise exception 'feedback_too_long';
  end if;
  -- 同一使用者的送出依序處理，避免並行請求繞過上限
  perform pg_advisory_xact_lock(hashtext('feedback:' || v_uid::text));
  if (select count(*) from public.feedback
      where user_id = v_uid and created_at > now() - interval '1 day') >= c_daily_limit then
    raise exception 'rate_limited';
  end if;

  insert into public.feedback (user_id, body) values (v_uid, v_body) returning id into v_id;
  return v_id;
end;
$$;

------------------------------------------------------------
-- Grants & Row Level Security：使用者完全碰不到這張表，只有管理員
------------------------------------------------------------
alter table public.feedback enable row level security;

revoke all on public.feedback from anon, authenticated;
grant select, delete on public.feedback to authenticated;
grant update (is_read) on public.feedback to authenticated;

create policy "feedback: admin select" on public.feedback
  for select to authenticated
  using ((select public.is_admin()));

create policy "feedback: admin update" on public.feedback
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "feedback: admin delete" on public.feedback
  for delete to authenticated
  using ((select public.is_admin()));

revoke execute on function public.submit_feedback(text) from public, anon;
grant execute on function public.submit_feedback(text) to authenticated;

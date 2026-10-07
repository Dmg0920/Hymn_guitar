-- 修正：帳號密碼註冊的 username 沒有寫進 profiles。
--
-- 原因：GoTrue 的 admin createUser 先 INSERT auth.users（此時 app_metadata 只有 provider），
-- 之後才在同一個 transaction 裡 UPDATE 寫入呼叫端給的 app_metadata。
-- 0001 的 handle_new_user 只在 INSERT 時執行，所以讀不到 username。
--
-- 做法：app_metadata.username 變動時補寫 profiles.username（只補空值，不覆蓋）。
-- app_metadata 只有 secret key 能寫，所以仍然不信任使用者可控的 user_metadata。

create function public.sync_username_from_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := new.raw_app_meta_data ->> 'username';
begin
  if v_username ~ '^[a-z0-9_]{3,20}$' then
    update public.profiles set username = v_username
      where id = new.id and username is null;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_username_from_app_metadata() from public, anon, authenticated;

create trigger on_auth_user_app_metadata_updated
  after update of raw_app_meta_data on auth.users
  for each row
  when (new.raw_app_meta_data ->> 'username' is distinct from old.raw_app_meta_data ->> 'username')
  execute function public.sync_username_from_app_metadata();

-- 補齊這個修正之前註冊的帳號
update public.profiles p
  set username = u.raw_app_meta_data ->> 'username'
  from auth.users u
  where p.id = u.id
    and p.username is null
    and u.raw_app_meta_data ->> 'username' ~ '^[a-z0-9_]{3,20}$';

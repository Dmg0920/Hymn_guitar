-- 詩歌吉他點歌網站：資料表、權限（RLS）、點歌 RPC、縮圖 storage。
-- 在 Supabase Dashboard → SQL Editor 執行一次即可。

------------------------------------------------------------
-- Types
------------------------------------------------------------
create type public.song_book as enum ('hymn', 'supplement', 'other');
create type public.song_status as enum ('open', 'practicing', 'uploaded', 'declined');

------------------------------------------------------------
-- Helpers
------------------------------------------------------------
-- 「其他」歌名去重用：去掉空白與常見標點、轉小寫。
create function public.normalize_title(t text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(t, ''), '[[:space:][:punct:]　，。、！？；：「」『』“”‘’（）－—…・]+', '', 'g'))
$$;

------------------------------------------------------------
-- Tables
------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  nickname text check (char_length(btrim(nickname)) between 1 and 20),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.songs (
  id bigint generated always as identity primary key,
  book public.song_book not null,
  code text,
  title text check (char_length(title) <= 50),
  category text,
  sort_key integer,
  status public.song_status not null default 'open',
  post_url text check (post_url ~ '^https://'),
  thumbnail_url text check (thumbnail_url ~ '^https://'),
  uploaded_at timestamptz,
  request_count integer not null default 0,
  last_requested_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (book, code),
  check ((book = 'other') = (code is null)),
  check (book <> 'other' or title is not null),
  check (status <> 'uploaded' or (post_url is not null and uploaded_at is not null))
);

create unique index songs_other_title_key
  on public.songs (public.normalize_title(title))
  where book = 'other';
create index songs_uploaded_idx on public.songs (uploaded_at desc) where status = 'uploaded';
create index songs_requested_idx on public.songs (request_count desc) where request_count > 0;

create table public.requests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  song_id bigint not null references public.songs (id) on delete cascade,
  message text check (char_length(message) <= 100),
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

-- 每日點歌上限用：只增不減（使用者無任何權限），取消點歌不會重置額度。
create table public.request_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index request_log_user_created_idx on public.request_log (user_id, created_at desc);

create index requests_song_idx on public.requests (song_id);
create index requests_user_created_idx on public.requests (user_id, created_at desc);

------------------------------------------------------------
-- Auth helpers & triggers
------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- 新使用者建立時自動建 profile。
-- username 只從 app_metadata 讀（只有伺服器的 secret key 能設定）；
-- user_metadata 任何人都能透過公開 API 填，所以只拿來帶暱稱。
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := new.raw_app_meta_data ->> 'username';
  v_nickname text := btrim(new.raw_user_meta_data ->> 'nickname');
begin
  insert into public.profiles (id, username, nickname)
  values (
    new.id,
    case when v_username ~ '^[a-z0-9_]{3,20}$' then v_username end,
    case when char_length(v_nickname) between 1 and 20 then v_nickname end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 維護 songs.request_count，讓公開頁面可以顯示點播數，又不必公開誰點了什麼。
create function public.sync_request_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.songs
      set request_count = request_count + 1, last_requested_at = new.created_at
      where id = new.song_id;
    return new;
  end if;

  update public.songs
    set request_count = greatest(request_count - 1, 0)
    where id = old.song_id;
  return old;
end;
$$;

create trigger requests_sync_count
  after insert or delete on public.requests
  for each row execute function public.sync_request_count();

------------------------------------------------------------
-- 點歌 RPC：唯一能新增 requests 與「其他」歌曲的入口
------------------------------------------------------------
create function public.request_song(
  p_song_id bigint default null,
  p_title text default null,
  p_message text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_daily_limit constant integer := 10;
  v_uid uuid := auth.uid();
  v_title text := nullif(btrim(p_title), '');
  v_message text := nullif(btrim(p_message), '');
  v_song public.songs%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and nickname is not null) then
    raise exception 'nickname_required';
  end if;
  if char_length(v_message) > 100 then
    raise exception 'message_too_long';
  end if;
  -- 同一使用者的點歌依序處理，避免並行請求繞過上限
  perform pg_advisory_xact_lock(hashtext(v_uid::text));
  if (select count(*) from public.request_log
      where user_id = v_uid and created_at > now() - interval '1 day') >= c_daily_limit then
    raise exception 'rate_limited';
  end if;

  if p_song_id is not null then
    select * into v_song from public.songs where id = p_song_id;
    if not found then
      raise exception 'song_not_found';
    end if;
  elsif v_title is not null then
    if char_length(v_title) > 50 then
      raise exception 'title_too_long';
    end if;
    if public.normalize_title(v_title) = '' then
      raise exception 'title_invalid';
    end if;

    insert into public.songs (book, title, created_by)
      values ('other', v_title, v_uid)
      on conflict (public.normalize_title(title)) where book = 'other' do nothing;
    select * into v_song from public.songs
      where book = 'other' and public.normalize_title(title) = public.normalize_title(v_title);
  else
    raise exception 'song_required';
  end if;

  if v_song.status = 'uploaded' then
    raise exception 'already_uploaded';
  end if;
  if v_song.status = 'declined' then
    raise exception 'declined';
  end if;

  insert into public.requests (user_id, song_id, message)
    values (v_uid, v_song.id, v_message)
    on conflict (user_id, song_id)
    do update set message = coalesce(excluded.message, public.requests.message);
  insert into public.request_log (user_id) values (v_uid);

  return v_song.id;
end;
$$;

------------------------------------------------------------
-- Grants & Row Level Security
------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.requests enable row level security;
alter table public.request_log enable row level security;

revoke all on public.profiles, public.songs, public.requests, public.request_log from anon, authenticated;

-- profiles：本人可讀、可改暱稱；管理員可讀全部（看點歌者暱稱、重設密碼）。
grant select on public.profiles to authenticated;
grant update (nickname) on public.profiles to authenticated;

create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- songs：所有人可讀（created_by 除外，避免能追出誰點了哪些「其他」歌）；只有管理員能改。
grant select (
  id, book, code, title, category, sort_key, status, post_url, thumbnail_url,
  uploaded_at, request_count, last_requested_at, created_at
) on public.songs to anon, authenticated;
grant insert, update, delete on public.songs to authenticated;

create policy "songs: public read" on public.songs
  for select to anon, authenticated
  using (true);

create policy "songs: admin insert" on public.songs
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "songs: admin update" on public.songs
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "songs: admin delete" on public.songs
  for delete to authenticated
  using ((select public.is_admin()));

-- requests：本人可讀、可取消；管理員可讀全部。新增只能走 request_song()。
grant select, delete on public.requests to authenticated;

create policy "requests: read own or admin" on public.requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "requests: delete own" on public.requests
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Functions
revoke execute on function public.request_song(bigint, text, text) from public, anon;
grant execute on function public.request_song(bigint, text, text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_request_count() from public, anon, authenticated;

------------------------------------------------------------
-- Storage：縮圖（公開讀取，只有管理員能上傳）
------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbnails', 'thumbnails', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "thumbnails: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'thumbnails' and (select public.is_admin()));

create policy "thumbnails: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'thumbnails' and (select public.is_admin()));

create policy "thumbnails: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'thumbnails' and (select public.is_admin()));

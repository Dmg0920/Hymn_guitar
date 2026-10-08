-- 個人檔案：頭像、自介、IG 帳號、公開 / 私人切換、最愛詩歌。
-- 在 Supabase Dashboard → SQL Editor 執行這一個檔案即可。
--
-- 隱私原則：
--   * 預設私人（is_public = false），只有本人與管理員看得到。
--   * 公開的檔案只透過 public_profiles view 暴露「安全欄位」，
--     不會洩漏 username（登入帳號）、is_admin，也不會公開誰點了哪些歌，只公開總數。

------------------------------------------------------------
-- profiles 新欄位
------------------------------------------------------------
alter table public.profiles
  add column bio text check (char_length(bio) <= 150),
  add column avatar_path text,
  add column ig_handle text check (ig_handle ~ '^[a-z0-9._]{1,30}$'),
  add column is_public boolean not null default false;

-- 頭像一定放在自己的資料夾：<user id>/<檔名>.jpg|png|webp
alter table public.profiles
  add constraint profiles_avatar_path_check
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9_-]+\.(jpg|png|webp)$'));

grant update (bio, avatar_path, ig_handle, is_public) on public.profiles to authenticated;

------------------------------------------------------------
-- 公開檔案
------------------------------------------------------------
create function public.is_public_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = p_id and is_public and nickname is not null
  )
$$;

-- 這個 view 以擁有者權限執行（會略過 profiles / requests 的 RLS），
-- 所以只選安全欄位，而且只列出 is_public 的人。
create view public.public_profiles as
select
  p.id,
  p.nickname,
  p.bio,
  p.avatar_path,
  p.ig_handle,
  p.created_at,
  (select count(*)::int from public.requests r where r.user_id = p.id) as request_total,
  (select count(*)::int
     from public.requests r
     join public.songs s on s.id = r.song_id
     where r.user_id = p.id and s.status = 'uploaded') as uploaded_total
from public.profiles p
where p.is_public and p.nickname is not null;

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

------------------------------------------------------------
-- 最愛詩歌（最多 5 首，有順序）
------------------------------------------------------------
create table public.favorite_songs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  song_id bigint not null references public.songs (id) on delete cascade,
  position smallint not null check (position between 1 and 5),
  primary key (user_id, song_id),
  unique (user_id, position)
);

alter table public.favorite_songs enable row level security;

revoke all on public.favorite_songs from anon, authenticated;
grant select on public.favorite_songs to anon, authenticated;

create policy "favorite_songs: read own, public or admin" on public.favorite_songs
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or public.is_public_profile(user_id)
    or (select public.is_admin())
  );

-- 整份取代：唯一能寫入 favorite_songs 的入口
create function public.set_favorites(p_song_ids bigint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max constant integer := 5;
  v_uid uuid := auth.uid();
  v_ids bigint[] := coalesce(p_song_ids, '{}');
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and nickname is not null) then
    raise exception 'nickname_required';
  end if;
  if cardinality(v_ids) > c_max then
    raise exception 'too_many_favorites';
  end if;
  if (select count(distinct t.sid) from unnest(v_ids) as t(sid)) <> cardinality(v_ids) then
    raise exception 'duplicate_favorite';
  end if;
  if exists (
    select 1 from unnest(v_ids) as t(sid)
    where not exists (select 1 from public.songs s where s.id = t.sid)
  ) then
    raise exception 'song_not_found';
  end if;

  -- 同一使用者的儲存依序處理，避免並行請求互相覆蓋
  perform pg_advisory_xact_lock(hashtext('favorites:' || v_uid::text));
  delete from public.favorite_songs where user_id = v_uid;
  insert into public.favorite_songs (user_id, song_id, position)
    select v_uid, t.sid, t.ord::smallint
    from unnest(v_ids) with ordinality as t(sid, ord);
end;
$$;

revoke execute on function public.set_favorites(bigint[]) from public, anon;
grant execute on function public.set_favorites(bigint[]) to authenticated;
revoke execute on function public.is_public_profile(uuid) from public;
grant execute on function public.is_public_profile(uuid) to anon, authenticated;

------------------------------------------------------------
-- Storage：頭像（公開讀取，每人只能動自己資料夾裡的檔案）
------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 204800, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 讀取用公開網址不需要 policy；select policy 是給 storage API 列出 / 刪除自己的檔案用
create policy "avatars: own select" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: own insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

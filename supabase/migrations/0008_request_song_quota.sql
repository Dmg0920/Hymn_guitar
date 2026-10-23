-- 修正：對已點過的歌再送出（只是更新留言）也會被計入每日 10 首額度。
-- 現在只有新增點歌才寫入 request_log；取消後重點仍是新增，所以「取消不會重置額度」不變。
-- 在 Supabase Dashboard → SQL Editor 執行這一個檔案即可。

create or replace function public.request_song(
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
  v_is_new boolean;
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
  -- 額度用完時仍可更新「已點過的歌」的留言（那不是新增點歌）
  if (select count(*) from public.request_log
      where user_id = v_uid and created_at > now() - interval '1 day') >= c_daily_limit
     and not exists (select 1 from public.requests where user_id = v_uid and song_id = p_song_id) then
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
    do update set message = coalesce(excluded.message, public.requests.message)
    returning (xmax = 0) into v_is_new;
  -- 只有真的新增一筆點歌才計入每日額度；更新留言不吃額度
  if v_is_new then
    insert into public.request_log (user_id) values (v_uid);
  end if;

  return v_song.id;
end;
$$;

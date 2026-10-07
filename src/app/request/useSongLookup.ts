'use client';

import { useEffect, useState } from 'react';
import { SONG_COLUMNS, type Song } from '@/lib/songs';
import { createClient } from '@/lib/supabase/client';
import { escapeLikePattern, parseSongCode } from '@/lib/validation';

const DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 8;

type CacheEntry<T> = { data: T } | { error: true };

export type CodeLookup =
  | { kind: 'empty' }
  | { kind: 'invalid'; message: string }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'notFound' }
  | { kind: 'found'; song: Song };

/**
 * 依「詩歌本 / 補充本 + 號碼」查歌。結果依 key 快取在 state 裡，
 * 只有在 debounce 計時結束的 callback 中才 setState。
 */
export function useSongByCode(book: 'hymn' | 'supplement', input: string): CodeLookup {
  const [cache, setCache] = useState<Record<string, CacheEntry<Song | null>>>({});

  const parsed = input.trim() === '' ? null : parseSongCode(book, input);
  const key = parsed?.ok ? `${book}:${parsed.value}` : null;
  const code = parsed?.ok ? parsed.value : null;
  const cached = key ? cache[key] : undefined;

  useEffect(() => {
    if (!key || !code || cached) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await createClient()
        .from('songs')
        .select(SONG_COLUMNS)
        .eq('book', book)
        .eq('code', code)
        .maybeSingle();
      if (cancelled) return;
      setCache((prev) => ({ ...prev, [key]: error ? { error: true } : { data: data as Song | null } }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [book, key, code, cached]);

  if (!parsed) return { kind: 'empty' };
  if (!parsed.ok) return { kind: 'invalid', message: parsed.error };
  if (!cached) return { kind: 'loading' };
  if ('error' in cached) return { kind: 'error' };
  return cached.data ? { kind: 'found', song: cached.data } : { kind: 'notFound' };
}

export type TitleSearch =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'done'; results: Song[] };

/** 用歌名搜尋所有歌（包含補充本），讓「其他」不會重複建立已存在的歌。 */
export function useTitleSearch(input: string): TitleSearch {
  const [cache, setCache] = useState<Record<string, CacheEntry<Song[]>>>({});

  const query = input.trim();
  const cached = query ? cache[query] : undefined;

  useEffect(() => {
    if (!query || cached) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await createClient()
        .from('songs')
        .select(SONG_COLUMNS)
        .ilike('title', `%${escapeLikePattern(query)}%`)
        .order('request_count', { ascending: false })
        .limit(SEARCH_LIMIT);
      if (cancelled) return;
      setCache((prev) => ({ ...prev, [query]: error ? { error: true } : { data: (data ?? []) as Song[] } }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, cached]);

  if (!query) return { kind: 'empty' };
  if (!cached) return { kind: 'loading' };
  if ('error' in cached) return { kind: 'error' };
  return { kind: 'done', results: cached.data };
}

'use client';

import { useActionState, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { FormMessage } from '@/components/FormMessage';
import { SongThumbnail } from '@/components/SongThumbnail';
import { SubmitButton } from '@/components/SubmitButton';
import { formatDate } from '@/lib/format';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { STATUS_LABELS, STATUS_ORDER, songHeading, type SongStatus, type SongWithEta } from '@/lib/songs';
import { createClient } from '@/lib/supabase/client';
import { TITLE_MAX } from '@/lib/validation';
import { updateSong } from './actions';

export type Requester = {
  nickname: string;
  avatarUrl: string | null;
  igHandle: string | null;
  message: string | null;
  createdAt: string;
};

const THUMBNAIL_BUCKET = 'thumbnails';
const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;
const THUMBNAIL_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

type Props = { song: SongWithEta; requesters: Requester[] };

export function AdminSongRow({ song, requesters }: Props) {
  const [state, action, pending] = useActionState(updateSong, INITIAL_FORM_STATE);
  // 欄位用 controlled：React 19 的 form action 結束後會 reset 表單，送出失敗時不能把剛改的內容洗掉
  const [status, setStatus] = useState<SongStatus>(song.status);
  const [title, setTitle] = useState(song.title ?? '');
  const [expectedAt, setExpectedAt] = useState(song.expected_at ?? '');
  const [postUrl, setPostUrl] = useState(song.post_url ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState(song.thumbnail_url ?? '');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onFileChange(file: File | undefined) {
    if (!file) return;
    const ext = THUMBNAIL_TYPES[file.type];
    if (!ext) return setUploadError('只接受 JPG、PNG、WebP');
    if (file.size > THUMBNAIL_MAX_BYTES) return setUploadError('圖片不能超過 2MB');

    setUploading(true);
    setUploadError(null);
    const supabase = createClient();
    const path = `${song.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(THUMBNAIL_BUCKET).upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadError(`上傳失敗：${error.message}`);
    setThumbnailUrl(supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path).data.publicUrl);
  }

  return (
    <li className="card space-y-4 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <SongThumbnail song={{ ...song, thumbnail_url: thumbnailUrl || null }} className="w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-xl font-bold">{songHeading(song)}</p>
          {song.category && <p className="text-sm text-muted">{song.category}</p>}
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span className="font-medium text-accent">{song.request_count} 人點播</span>
            <span className="rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-medium text-muted">
              {STATUS_LABELS[song.status]}
            </span>
          </p>
        </div>
      </div>

      {requesters.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted transition-colors hover:text-ink">誰點了這首</summary>
          <ul className="mt-2 space-y-2">
            {requesters.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <Avatar src={r.avatarUrl} nickname={r.nickname} className="size-7" />
                <p className="min-w-0">
                  <span className="font-medium">{r.nickname}</span>
                  {r.igHandle && (
                    <a
                      href={`https://www.instagram.com/${r.igHandle}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs text-accent underline-offset-4 hover:underline"
                    >
                      @{r.igHandle}
                    </a>
                  )}
                  <span className="ml-2 text-xs text-muted">{formatDate(r.createdAt)}</span>
                  {r.message && <span className="ml-2 text-muted">「{r.message}」</span>}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="song_id" value={song.id} />
        <input type="hidden" name="thumbnail_url" value={thumbnailUrl} />
        <label className="block">
          <span className="label">狀態</span>
          <select name="status" value={status} onChange={(e) => setStatus(e.target.value as SongStatus)} className="input">
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">歌名</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            className="input"
          />
        </label>
        {status === 'practicing' && (
          <label className="block sm:col-span-2">
            <span className="label">預計上傳日（選填，會顯示在首頁練習排程；有填的排在前面）</span>
            <input
              name="expected_at"
              type="date"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
              className="input sm:max-w-60"
            />
          </label>
        )}
        <label className="block sm:col-span-2">
          <span className="label">IG / YouTube 連結</span>
          <input
            name="post_url"
            type="url"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            className="input"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">縮圖（JPG / PNG / WebP，2MB 內）</span>
          <input
            type="file"
            accept={Object.keys(THUMBNAIL_TYPES).join(',')}
            onChange={(e) => onFileChange(e.target.files?.[0])}
            className="block w-full text-sm text-muted file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-full file:border-0 file:bg-accent-soft file:px-4 file:font-medium file:text-accent hover:file:brightness-95"
          />
        </label>
        {(uploading || uploadError) && (
          <p
            role={uploadError ? 'alert' : 'status'}
            className={`text-sm sm:col-span-2 ${uploadError ? 'text-danger' : 'text-muted'}`}
          >
            {uploadError ?? '縮圖上傳中…'}
          </p>
        )}
        <div className="flex items-center gap-3 sm:col-span-2">
          <SubmitButton pending={pending || uploading} idle="儲存" busy={uploading ? '上傳縮圖中…' : '儲存中…'} className="min-h-12 px-8" />
          <FormMessage state={state} />
        </div>
      </form>
    </li>
  );
}

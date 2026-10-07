'use client';

import { useActionState, useState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { SongThumbnail } from '@/components/SongThumbnail';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { STATUS_LABELS, STATUS_ORDER, songHeading, type Song } from '@/lib/songs';
import { createClient } from '@/lib/supabase/client';
import { TITLE_MAX } from '@/lib/validation';
import { updateSong } from './actions';

export type Requester = { nickname: string; message: string | null; createdAt: string };

const THUMBNAIL_BUCKET = 'thumbnails';
const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;
const THUMBNAIL_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

type Props = { song: Song; requesters: Requester[] };

export function AdminSongRow({ song, requesters }: Props) {
  const [state, action, pending] = useActionState(updateSong, INITIAL_FORM_STATE);
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
    <li className="card space-y-3 p-4">
      <div className="flex items-start gap-3">
        <SongThumbnail song={{ ...song, thumbnail_url: thumbnailUrl || null }} className="w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{songHeading(song)}</p>
          {song.category && <p className="text-sm text-muted">{song.category}</p>}
          <p className="text-sm">
            <span className="font-medium text-accent">{song.request_count} 人點播</span>
            <span className="ml-2 text-muted">{STATUS_LABELS[song.status]}</span>
          </p>
        </div>
      </div>

      {requesters.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">誰點了這首</summary>
          <ul className="mt-2 space-y-1">
            {requesters.map((r, i) => (
              <li key={i}>
                <span className="font-medium">{r.nickname}</span>
                <span className="ml-2 text-xs text-muted">{new Date(r.createdAt).toLocaleDateString('zh-TW')}</span>
                {r.message && <span className="ml-2 text-muted">「{r.message}」</span>}
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
          <select name="status" defaultValue={song.status} className="input">
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">歌名</span>
          <input name="title" defaultValue={song.title ?? ''} maxLength={TITLE_MAX} className="input" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">IG / YouTube 連結</span>
          <input
            name="post_url"
            type="url"
            defaultValue={song.post_url ?? ''}
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
            className="text-sm"
          />
          {uploading && <span className="ml-2 text-sm text-muted">上傳中…</span>}
          {uploadError && <span className="ml-2 text-sm text-danger">{uploadError}</span>}
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending || uploading} className="btn-primary">
            {pending ? '儲存中…' : '儲存'}
          </button>
          <FormMessage state={state} />
        </div>
      </form>
    </li>
  );
}

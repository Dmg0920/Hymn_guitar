'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import type { Song } from '@/lib/songs';
import { BIO_MAX, NICKNAME_MAX } from '@/lib/validation';
import { saveProfile } from './actions';
import { AvatarError, resizeAvatar } from './avatar-resize';
import { FavoritesEditor } from './FavoritesEditor';

type Initial = {
  nickname: string;
  bio: string;
  igHandle: string;
  isPublic: boolean;
  avatarUrl: string | null;
  favorites: Song[];
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState(saveProfile, INITIAL_FORM_STATE);
  // 欄位用 controlled：React 19 的 form action 結束後會 reset 表單，送出失敗時不能把剛打的內容洗掉
  const [nickname, setNickname] = useState(initial.nickname);
  const [bio, setBio] = useState(initial.bio);
  const [igHandle, setIgHandle] = useState(initial.igHandle);
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [favorites, setFavorites] = useState(initial.favorites);

  // 頭像：newAvatar 是瀏覽器裁好的檔案（尚未上傳）；removeAvatar 表示要清掉目前的頭像
  const [newAvatar, setNewAvatar] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // 預覽用的 object URL 要自己釋放：換圖 / 還原時釋放舊的，離開頁面時釋放最後一個
  const previewRef = useRef<string | null>(null);
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);
  function replaceAvatar(blob: Blob | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = blob ? URL.createObjectURL(blob) : null;
    setNewAvatar(blob && previewRef.current ? { blob, previewUrl: previewRef.current } : null);
  }

  async function onPickAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarError(null);
    try {
      replaceAvatar(await resizeAvatar(file));
      setRemoveAvatar(false);
    } catch (error) {
      setAvatarError(error instanceof AvatarError ? error.message : '無法處理這張圖片');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const shownAvatar = removeAvatar ? null : (newAvatar?.previewUrl ?? initial.avatarUrl);

  return (
    <form
      action={(formData) => {
        if (newAvatar) formData.set('avatar', newAvatar.blob, 'avatar');
        return formAction(formData);
      }}
      className="card space-y-8 p-5 shadow-xl shadow-black/5 md:p-7"
    >
      <fieldset className="space-y-3">
        <legend className="label">頭像</legend>
        <div className="flex items-center gap-4">
          <Avatar src={shownAvatar} nickname={nickname || '?'} className="size-20" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => fileInput.current?.click()} className="btn-ghost min-h-11 px-5 text-sm">
              {shownAvatar ? '更換圖片' : '選擇圖片'}
            </button>
            {(newAvatar || (initial.avatarUrl && !removeAvatar)) && (
              <button
                type="button"
                onClick={() => {
                  replaceAvatar(null);
                  setRemoveAvatar(Boolean(initial.avatarUrl));
                }}
                className="min-h-11 px-3 text-sm text-muted underline-offset-4 hover:text-danger hover:underline"
              >
                {newAvatar && initial.avatarUrl ? '還原' : '移除'}
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={(e) => onPickAvatar(e.target.files?.[0])}
          className="sr-only"
          tabIndex={-1}
          aria-label="選擇頭像圖片"
        />
        {removeAvatar && <input type="hidden" name="remove_avatar" value="1" />}
        {avatarError ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {avatarError}
          </p>
        ) : (
          <p className="text-xs text-muted">會自動置中裁成正方形並縮小，按下儲存後才會上傳。</p>
        )}
      </fieldset>

      <div>
        <label htmlFor="nickname" className="label">
          暱稱
        </label>
        <input
          id="nickname"
          name="nickname"
          required
          maxLength={NICKNAME_MAX}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          autoComplete="nickname"
          className="input font-serif text-lg font-bold"
        />
      </div>

      <div className="relative">
        <label htmlFor="bio" className="label">
          自介（選填）
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="例如：喜歡慢板的詩歌，最近在學吉他"
          className="input resize-none"
        />
        {bio.length > 0 && (
          <span className="absolute bottom-3 right-3 text-xs tabular-nums text-muted">
            {bio.length}/{BIO_MAX}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="ig_handle" className="label">
          Instagram（選填）
        </label>
        <input
          id="ig_handle"
          name="ig_handle"
          value={igHandle}
          onChange={(e) => setIgHandle(e.target.value)}
          placeholder="@你的帳號"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="input"
        />
        <p className="mt-1.5 text-xs text-muted">站長看得到，方便聯絡你；檔案設為公開時，也會顯示給所有人。</p>
      </div>

      <fieldset className="space-y-3">
        <legend className="label">最愛的詩歌（最多 5 首）</legend>
        {favorites.map((song) => (
          <input key={song.id} type="hidden" name="favorite" value={song.id} />
        ))}
        <FavoritesEditor songs={favorites} onChange={setFavorites} />
      </fieldset>

      <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-line bg-paper p-4">
        <input
          type="checkbox"
          name="is_public"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
        />
        <span>
          <span className="block font-medium">公開我的檔案</span>
          <span className="mt-1 block text-sm text-muted">
            {isPublic
              ? '任何人都能用連結看到你的頭像、暱稱、自介、IG、最愛詩歌、徽章和點歌總數。你點了哪些歌仍然不會公開。'
              : '目前只有你和站長看得到。打開後，擁有連結的人就能看到你的頭像、暱稱、自介、IG、最愛詩歌、徽章和點歌總數（不含你點了哪些歌）。'}
          </span>
        </span>
      </label>

      <FormMessage state={state} />
      <SubmitButton pending={pending} idle="儲存" busy="儲存中…" />
    </form>
  );
}

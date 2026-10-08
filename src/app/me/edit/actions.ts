'use server';

import { redirect } from 'next/navigation';
import { requireViewer } from '@/lib/auth';
import { AVATAR_BUCKET } from '@/lib/avatar';
import { AVATAR_MAX_BYTES, sniffAvatarType } from '@/lib/avatar-type';
import type { FormState } from '@/lib/form-state';
import { createClient } from '@/lib/supabase/server';
import { parseBio, parseFavoriteIds, parseInstagram, parseNickname } from '@/lib/validation';

// set_favorites() 以 raise exception 回傳的代碼
const FAVORITE_ERRORS: Record<string, string> = {
  too_many_favorites: '最愛最多 5 首',
  duplicate_favorite: '最愛不能重複',
  song_not_found: '有一首歌找不到，請重新挑選',
  nickname_required: '請先設定暱稱',
  not_authenticated: '請先登入',
};

export async function saveProfile(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer('/me/edit');

  const nickname = parseNickname(formData.get('nickname'));
  if (!nickname.ok) return { error: nickname.error };
  const bio = parseBio(formData.get('bio'));
  if (!bio.ok) return { error: bio.error };
  const instagram = parseInstagram(formData.get('ig_handle'));
  if (!instagram.ok) return { error: instagram.error };
  const favorites = parseFavoriteIds(formData.getAll('favorite'));
  if (!favorites.ok) return { error: favorites.error };
  const isPublic = formData.get('is_public') === 'on';

  const supabase = await createClient();
  const storage = supabase.storage.from(AVATAR_BUCKET);

  // 頭像：新檔案（瀏覽器已裁切縮小）> 移除 > 維持原樣
  let avatarPath: string | null | undefined; // undefined = 不變
  let uploadedPath: string | null = null;
  const file = formData.get('avatar');
  if (file instanceof File && file.size > 0) {
    if (file.size > AVATAR_MAX_BYTES) return { error: '頭像檔案太大，請重新選擇' };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffAvatarType(bytes);
    if (!type) return { error: '頭像只接受 JPG、PNG、WebP' };

    uploadedPath = `${viewer.id}/${Date.now()}.${type.ext}`;
    const { error } = await storage.upload(uploadedPath, bytes, { contentType: type.mime });
    if (error) {
      console.error('saveProfile: avatar upload failed', error);
      return { error: '頭像上傳失敗，請稍後再試' };
    }
    avatarPath = uploadedPath;
  } else if (formData.get('remove_avatar') === '1') {
    avatarPath = null;
  }

  const discardUpload = async () => {
    if (uploadedPath) await storage.remove([uploadedPath]);
  };

  const { error: favoritesError } = await supabase.rpc('set_favorites', { p_song_ids: favorites.value });
  if (favoritesError) {
    await discardUpload();
    const known = FAVORITE_ERRORS[favoritesError.message];
    if (!known) console.error('saveProfile: set_favorites failed', favoritesError);
    return { error: known ?? '儲存失敗，請稍後再試' };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      nickname: nickname.value,
      bio: bio.value,
      ig_handle: instagram.value,
      is_public: isPublic,
      ...(avatarPath !== undefined && { avatar_path: avatarPath }),
    })
    .eq('id', viewer.id);
  if (updateError) {
    await discardUpload();
    console.error('saveProfile: profile update failed', updateError);
    return { error: '儲存失敗，請稍後再試' };
  }

  // 舊頭像已經沒人用了，清掉；失敗只記錄，不影響儲存結果
  if (avatarPath !== undefined && viewer.avatarPath) {
    const { error } = await storage.remove([viewer.avatarPath]);
    if (error) console.error('saveProfile: old avatar cleanup failed', error);
  }

  redirect('/me');
}

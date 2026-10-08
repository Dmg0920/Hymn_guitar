import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth';
import { avatarPublicUrl } from '@/lib/avatar';
import { loadFavoriteSongs } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = { title: '編輯檔案' };

export default async function EditProfilePage() {
  const viewer = await requireViewer('/me/edit');
  const supabase = await createClient();
  const [{ data: profile, error }, favorites] = await Promise.all([
    supabase.from('profiles').select('nickname, bio, avatar_path, ig_handle, is_public').eq('id', viewer.id).single(),
    loadFavoriteSongs(viewer.id),
  ]);
  if (error) throw new Error(`讀取個人資料失敗：${error.message}`);

  return (
    <section className="wrap-narrow pb-8 pt-12 md:pt-20">
      <Link href="/me" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 回我的檔案
      </Link>
      <p className="eyebrow mt-6">Edit profile</p>
      <h1 className="mt-4 font-serif text-5xl font-black tracking-wide md:text-6xl">編輯檔案</h1>
      <div className="mt-8">
        <ProfileForm
          initial={{
            nickname: profile.nickname ?? '',
            bio: profile.bio ?? '',
            igHandle: profile.ig_handle ?? '',
            isPublic: profile.is_public,
            avatarUrl: avatarPublicUrl(profile.avatar_path),
            favorites,
          }}
        />
      </div>
    </section>
  );
}

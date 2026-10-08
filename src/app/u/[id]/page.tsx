import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { FavoriteSongs } from '@/components/profile/FavoriteSongs';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { avatarPublicUrl } from '@/lib/avatar';
import { computeBadges } from '@/lib/badges';
import { loadFavoriteSongs } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 讀公開檔案。私人或不存在都回傳 null，呼叫端一律 404，不透露對方有沒有帳號。 */
async function loadPublicProfile(id: string) {
  if (!UUID_PATTERN.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from('public_profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`讀取個人檔案失敗：${error.message}`);
  return data;
}

export async function generateMetadata({ params }: PageProps<'/u/[id]'>): Promise<Metadata> {
  const profile = await loadPublicProfile((await params).id);
  return profile?.nickname ? { title: profile.nickname } : { title: '找不到這個檔案' };
}

export default async function PublicProfilePage({ params }: PageProps<'/u/[id]'>) {
  const { id } = await params;
  const profile = await loadPublicProfile(id);
  if (!profile || !profile.nickname || !profile.id || !profile.created_at) notFound();

  const favorites = await loadFavoriteSongs(profile.id);
  const earnedBadges = computeBadges({
    requestTotal: profile.request_total ?? 0,
    uploadedTotal: profile.uploaded_total ?? 0,
    joinedAt: profile.created_at,
    hasAvatar: Boolean(profile.avatar_path),
    hasBio: Boolean(profile.bio),
  }).filter((b) => b.earned);

  return (
    <section className="wrap-medium space-y-12 pb-8 pt-12 md:pt-20">
      <ProfileHeader
        nickname={profile.nickname}
        avatarUrl={avatarPublicUrl(profile.avatar_path)}
        bio={profile.bio}
        igHandle={profile.ig_handle}
        joinedAt={profile.created_at}
        requestTotal={profile.request_total ?? 0}
        uploadedTotal={profile.uploaded_total ?? 0}
      />

      {favorites.length > 0 && (
        <div>
          <h2 className="font-serif text-3xl font-black tracking-wide">最愛的詩歌</h2>
          <div className="mt-5">
            <FavoriteSongs songs={favorites} />
          </div>
        </div>
      )}

      {earnedBadges.length > 0 && (
        <div>
          <h2 className="font-serif text-3xl font-black tracking-wide">徽章</h2>
          <div className="mt-5">
            <BadgeGrid badges={earnedBadges} />
          </div>
        </div>
      )}
    </section>
  );
}

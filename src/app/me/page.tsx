import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { FavoriteSongs } from '@/components/profile/FavoriteSongs';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { Reveal } from '@/components/Reveal';
import { requireViewer } from '@/lib/auth';
import { avatarPublicUrl } from '@/lib/avatar';
import { computeBadges } from '@/lib/badges';
import { loadFavoriteSongs } from '@/lib/profile';
import { SONG_COLUMNS, type Song } from '@/lib/songs';
import { createClient } from '@/lib/supabase/server';
import { CopyLinkButton } from './CopyLinkButton';
import { RequestItem } from './RequestItem';

export const metadata: Metadata = { title: '我的檔案' };

type MyRequest = { message: string | null; created_at: string; songs: Song };

export default async function MyProfilePage() {
  const viewer = await requireViewer('/me');
  const supabase = await createClient();

  const [profileResult, requestsResult, favorites] = await Promise.all([
    supabase
      .from('profiles')
      .select('nickname, bio, avatar_path, ig_handle, is_public, created_at')
      .eq('id', viewer.id)
      .single(),
    supabase
      .from('requests')
      .select(`message, created_at, songs!inner(${SONG_COLUMNS})`)
      .eq('user_id', viewer.id)
      .order('created_at', { ascending: false }),
    loadFavoriteSongs(viewer.id),
  ]);
  if (profileResult.error) throw new Error(`讀取個人資料失敗：${profileResult.error.message}`);
  if (requestsResult.error) throw new Error(`讀取點歌紀錄失敗：${requestsResult.error.message}`);
  const profile = profileResult.data;
  const requests = (requestsResult.data ?? []) as unknown as MyRequest[];

  const requestTotal = requests.length;
  const uploadedTotal = requests.filter((r) => r.songs.status === 'uploaded').length;
  const badges = computeBadges({
    requestTotal,
    uploadedTotal,
    joinedAt: profile.created_at,
    hasAvatar: Boolean(profile.avatar_path),
    hasBio: Boolean(profile.bio),
  });

  return (
    <section className="wrap-medium space-y-12 pb-8 pt-12 md:pt-20">
      <div>
        <p className="eyebrow mb-4">My profile</p>
        <ProfileHeader
          nickname={profile.nickname ?? ''}
          avatarUrl={avatarPublicUrl(profile.avatar_path)}
          bio={profile.bio}
          igHandle={profile.ig_handle}
          joinedAt={profile.created_at}
          requestTotal={requestTotal}
          uploadedTotal={uploadedTotal}
          tag={
            <span className="rounded-full border border-board-ink/25 px-3 py-0.5 text-xs font-medium tracking-wider text-board-muted">
              {profile.is_public ? '公開檔案' : '私人檔案'}
            </span>
          }
          actions={
            <>
              <Link href="/me/edit" className="btn-primary min-h-11 px-6">
                編輯檔案
              </Link>
              {profile.is_public && <CopyLinkButton path={`/u/${viewer.id}`} />}
            </>
          }
        />
        {!profile.is_public && (
          <p className="mt-3 px-1 text-sm text-muted">
            目前只有你和站長看得到這個檔案。想讓大家看到，到「編輯檔案」打開公開。
          </p>
        )}
      </div>

      <Reveal as="div">
        <h2 className="font-serif text-3xl font-black tracking-wide">最愛的詩歌</h2>
        <div className="mt-5">
          {favorites.length > 0 ? (
            <FavoriteSongs songs={favorites} />
          ) : (
            <p className="card px-6 py-8 text-center text-muted">
              還沒有挑最愛的詩歌。
              <Link href="/me/edit" className="ml-1 text-accent underline underline-offset-4">
                去挑最多 5 首
              </Link>
            </p>
          )}
        </div>
      </Reveal>

      <Reveal as="div">
        <h2 className="font-serif text-3xl font-black tracking-wide">徽章</h2>
        <div className="mt-5">
          <BadgeGrid badges={badges} />
        </div>
      </Reveal>

      <div id="requests" className="scroll-mt-24">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl font-black tracking-wide">我的點歌</h2>
          {requests.length > 0 && (
            <p className="pb-1 text-sm text-muted">
              共 <span className="numeral text-xl font-medium text-ink">{requests.length}</span> 首
            </p>
          )}
        </div>

        {requests.length === 0 ? (
          <div className="card mt-5 flex flex-col items-center gap-5 px-6 py-14 text-center">
            <p className="numeral text-6xl font-medium italic leading-none text-line-strong">♪</p>
            <p className="text-muted">你還沒有點過歌。</p>
            <Link href="/request" className="btn-primary">
              去點歌
            </Link>
          </div>
        ) : (
          <ul className="mt-5 space-y-4 md:mt-6">
            {requests.map(({ songs: song, message, created_at }, i) => (
              <Reveal key={song.id} as="li" delay={Math.min(i, 5) * 70}>
                <RequestItem song={song} message={message} createdAt={created_at} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

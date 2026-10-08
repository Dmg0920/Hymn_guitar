import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { getViewer, type Viewer } from '@/lib/auth';
import { avatarPublicUrl } from '@/lib/avatar';
import { countUnseenUploads } from '@/lib/notifications';
import { SITE } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import { AccountMenu } from './AccountMenu';
import { LogoMark } from './LogoMark';
import { NavLink } from './NavLink';

export async function Header() {
  // Header 在 root layout，app/error.tsx 接不到這裡的錯誤；
  // 讀取失敗就先當未登入顯示，頁面本身的 getViewer 會再拋錯並顯示錯誤頁。
  let viewer: Viewer | null = null;
  let unseenCount = 0;
  try {
    viewer = await getViewer();
    if (viewer) unseenCount = await countUnseenUploads(await createClient(), viewer.id);
  } catch (error) {
    unstable_rethrow(error); // 不要吞掉 Next 內部用來切換動態渲染的錯誤
    console.error('Header: getViewer failed', error);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/75 backdrop-blur-xl backdrop-saturate-150">
      <nav aria-label="主選單" className="wrap flex h-16 items-center gap-3 sm:gap-6">
        <Link href="/" className="group mr-auto flex items-center gap-2.5" aria-label={`${SITE.name} 首頁`}>
          <LogoMark />
          <span className="font-serif text-lg font-bold tracking-[0.12em]">{SITE.name}</span>
        </Link>

        <NavLink href="/songs">已上傳</NavLink>
        <NavLink href="/request">點歌</NavLink>

        {viewer ? (
          <AccountMenu
            nickname={viewer.nickname}
            avatarUrl={avatarPublicUrl(viewer.avatarPath)}
            isAdmin={viewer.isAdmin}
            unseenCount={unseenCount}
          />
        ) : (
          <Link href="/login" className="btn-primary min-h-10 px-5">
            登入
          </Link>
        )}
      </nav>
    </header>
  );
}

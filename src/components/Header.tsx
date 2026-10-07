import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { signOut } from '@/app/login/actions';
import { getViewer, type Viewer } from '@/lib/auth';
import { SITE } from '@/lib/site';

export async function Header() {
  // Header 在 root layout，app/error.tsx 接不到這裡的錯誤；
  // 讀取失敗就先當未登入顯示，頁面本身的 getViewer 會再拋錯並顯示錯誤頁。
  let viewer: Viewer | null = null;
  try {
    viewer = await getViewer();
  } catch (error) {
    unstable_rethrow(error); // 不要吞掉 Next 內部用來切換動態渲染的錯誤
    console.error('Header: getViewer failed', error);
  }

  return (
    <header className="border-b border-line bg-card/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
        <Link href="/" className="mr-auto text-base font-semibold">
          🎸 {SITE.name}
        </Link>
        <Link href="/request" className="hover:text-accent">
          點歌
        </Link>
        {viewer && (
          <Link href="/me" className="hover:text-accent">
            我的點歌
          </Link>
        )}
        {viewer?.isAdmin && (
          <Link href="/admin" className="hover:text-accent">
            後台
          </Link>
        )}
        {viewer ? (
          <>
            {viewer.nickname ? (
              <span className="text-muted">{viewer.nickname}</span>
            ) : (
              <Link href="/onboarding" className="text-accent">
                設定暱稱
              </Link>
            )}
            <form action={signOut}>
              <button type="submit" className="text-muted hover:text-ink">
                登出
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="btn-primary px-4 py-1.5">
            登入
          </Link>
        )}
      </nav>
    </header>
  );
}

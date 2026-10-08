import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth';
import { ChangePasswordForm } from './ChangePasswordForm';
import { DeleteAccountForm } from './DeleteAccountForm';

export const metadata: Metadata = { title: '帳號設定' };

export default async function SettingsPage() {
  const viewer = await requireViewer('/me/settings');

  return (
    <section className="wrap-narrow space-y-12 pb-8 pt-12 md:pt-20">
      <div>
        <Link href="/me" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
          ← 回我的檔案
        </Link>
        <p className="eyebrow mt-6">Account</p>
        <h1 className="mt-4 font-serif text-5xl font-black tracking-wide md:text-6xl">帳號設定</h1>
        {viewer.username && (
          <p className="mt-4 text-muted">
            登入帳號：<span className="font-medium text-ink">{viewer.username}</span>
          </p>
        )}
      </div>

      <div>
        <h2 className="font-serif text-2xl font-black tracking-wide">更改密碼</h2>
        <div className="mt-5">
          {viewer.username ? (
            <ChangePasswordForm />
          ) : (
            <p className="card px-5 py-6 text-muted">你是用 Email 驗證碼登入的，不需要密碼。</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-serif text-2xl font-black tracking-wide text-danger">刪除帳號</h2>
        <p className="mt-3 text-sm text-muted">
          會永久刪除你的個人檔案、頭像、點歌紀錄、最愛詩歌與意見，無法復原。你點過的歌的點播數也會一併扣回。
        </p>
        <div className="mt-5">
          {viewer.isAdmin ? (
            <p className="card px-5 py-6 text-muted">管理員帳號不能直接刪除，請先在資料庫取消管理員身分。</p>
          ) : (
            <DeleteAccountForm />
          )}
        </div>
      </div>
    </section>
  );
}

import type { ReactNode } from 'react';
import { Avatar } from '@/components/Avatar';
import { formatDate } from '@/lib/format';

type Props = {
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  igHandle: string | null;
  joinedAt: string;
  requestTotal: number;
  uploadedTotal: number;
  /** 名字旁的小標籤（例如「公開」「私人」） */
  tag?: ReactNode;
  /** 底部的操作按鈕 */
  actions?: ReactNode;
};

/** 個人檔案的「號碼板」頭部：頭像、暱稱、自介、IG，以及兩個統計數字。/me 與 /u/[id] 共用。 */
export function ProfileHeader({
  nickname,
  avatarUrl,
  bio,
  igHandle,
  joinedAt,
  requestTotal,
  uploadedTotal,
  tag,
  actions,
}: Props) {
  return (
    <div className="board p-6 md:p-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <Avatar src={avatarUrl} nickname={nickname} className="size-24 ring-2 ring-brass/60 ring-offset-4 ring-offset-board md:size-32" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 break-words font-serif text-4xl font-black tracking-wide md:text-5xl">{nickname}</h1>
            {tag}
          </div>
          {bio && <p className="mt-3 max-w-prose whitespace-pre-line break-words text-board-ink/90">{bio}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-board-muted">
            {igHandle && (
              <a
                href={`https://www.instagram.com/${igHandle}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-8 items-center gap-1 text-brass underline-offset-4 hover:underline"
              >
                @{igHandle}
                <span aria-hidden="true">↗</span>
              </a>
            )}
            <span>{formatDate(joinedAt)} 加入</span>
          </p>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-board-ink/10 text-center">
        <Stat label="點過的歌" value={requestTotal} />
        <Stat label="已被上傳" value={uploadedTotal} />
      </dl>

      {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-board px-4 py-4">
      <dt className="text-xs tracking-[0.2em] text-board-muted">{label}</dt>
      <dd className="numeral mt-1 text-4xl font-medium leading-none text-brass md:text-5xl">{value}</dd>
    </div>
  );
}

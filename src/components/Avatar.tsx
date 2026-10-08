import Image from 'next/image';

type Props = {
  /** avatarPublicUrl() 的結果；null 時顯示暱稱第一個字 */
  src: string | null;
  nickname: string | null;
  /** Tailwind 尺寸 class，預設 size-8；文字大小用 container query，會跟著成比例 */
  className?: string;
};

/** 圓形頭像。沒有頭像時用暱稱第一個字，與原本帳號選單的樣式一致。 */
export function Avatar({ src, nickname, className = 'size-8' }: Props) {
  const initial = nickname ? (Array.from(nickname)[0] ?? '?') : '?';
  return (
    <span
      className={`@container relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-serif font-bold text-accent-ink ${className}`}
    >
      {src ? (
        // 頭像上傳時已縮成 256px，不需要再經過 Next 的圖片最佳化
        <Image src={src} alt="" fill unoptimized sizes="128px" className="object-cover" />
      ) : (
        <span aria-hidden="true" className="text-[45cqw] leading-none">
          {initial}
        </span>
      )}
    </span>
  );
}

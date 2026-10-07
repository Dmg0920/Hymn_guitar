// 換頁等待資料時的畫面：六條弦依序起伏，跟 hero 的弦呼應。
// 延遲 250ms 才淡入：資料很快回來時完全看不到，避免閃一下再跳版。
const STRING_COUNT = 6;

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="animate-fade grid min-h-[50vh] place-items-center [--delay:250ms]">
      <div className="flex h-12 items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: STRING_COUNT }, (_, i) => (
          <span
            key={i}
            className="h-full w-[3px] origin-center rounded-full bg-accent"
            style={{ animation: 'string-wave 1.1s ease-in-out infinite', animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
      <span className="sr-only">載入中…</span>
    </div>
  );
}

// template 每次換頁都會重新掛載，用來做頁面進場的淡入上移。
// 用 backwards 而不是 both：動畫結束後不保留 transform，避免替子孫建立 containing block。
export default function Template({ children }: { children: React.ReactNode }) {
  return <div style={{ animation: 'rise 0.55s var(--ease-out) backwards' }}>{children}</div>;
}

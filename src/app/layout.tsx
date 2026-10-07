import type { Metadata, Viewport } from 'next';
import { Fraunces, Noto_Serif_TC } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SITE } from '@/lib/site';
import './globals.css';

// 中文標題用 Noto Serif TC（unicode-range 切片，只下載頁面用到的字）；
// 號碼與拉丁字用 Fraunces，兩者組成「詩歌本」的排版氣質。
const serifTc = Noto_Serif_TC({
  weight: ['500', '700', '900'],
  variable: '--font-serif-tc',
  display: 'swap',
  preload: false,
});

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s｜${SITE.name}` },
  description: SITE.description,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2ece1' },
    { media: '(prefers-color-scheme: dark)', color: '#12100d' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="zh-Hant-TW"
      data-scroll-behavior="smooth"
      className={`${serifTc.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#main"
          className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-transform focus:translate-y-0"
        >
          跳到主要內容
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

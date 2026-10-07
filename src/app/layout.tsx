import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/Header';
import { SITE } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s｜${SITE.name}` },
  description: SITE.description,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-Hant-TW" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6">{children}</main>
      </body>
    </html>
  );
}

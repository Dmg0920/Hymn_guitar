import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="wrap-narrow flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="numeral text-[8rem] font-medium italic leading-none text-accent md:text-[11rem]">404</p>
      <h1 className="mt-4 font-serif text-2xl font-bold md:text-3xl">這一頁沒有收錄在歌本裡</h1>
      <p className="mt-3 text-muted">網址可能打錯了，或是這個頁面已經搬走。</p>
      <Link href="/" className="btn-primary mt-8">
        回到首頁
      </Link>
    </section>
  );
}

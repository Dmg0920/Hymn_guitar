'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** 導覽連結：目前頁面底線常駐，hover 時底線從左滑入。 */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`group relative px-1 py-2 text-[0.9375rem] font-medium tracking-wide transition-colors ${
        isActive ? 'text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
      <span
        aria-hidden="true"
        className={`absolute inset-x-1 bottom-0.5 h-[2px] origin-left rounded-full bg-accent transition-transform duration-500 ease-[var(--ease-out)] ${
          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
        }`}
      />
    </Link>
  );
}

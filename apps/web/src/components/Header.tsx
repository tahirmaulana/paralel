// @file apps/web/src/components/Header.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from './ConnectButton';

export function Header() {
  const pathname = usePathname();

  // Sembunyikan header di LP (karena tombol connect sudah besar di tengah)
  if (pathname === '/') return null;

  return (
    <header className="border-b bg-white px-8 py-4 flex justify-between items-center sticky top-0 z-10">
      <Link href="/" className="text-xl font-bold tracking-tight">
        Paralel
      </Link>
      <ConnectButton />
    </header>
  );
}
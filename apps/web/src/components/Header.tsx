// @file apps/web/src/components/Header.tsx
//
// Root header. `usePathname()` dipisahkan ke leaf child dan dibungkus
// <Suspense> supaya tidak memblokir prerender di bawah cacheComponents.
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from './ConnectButton';

function HeaderShell() {
  return (
    <header className="border-b bg-white px-8 py-4 flex justify-between items-center sticky top-0 z-10">
      <Link href="/" className="text-xl font-bold tracking-tight">
        Paralel
      </Link>
      <div className="flex items-center gap-5">
        <Link
          href="/auctions"
          className="text-sm font-semibold text-gray-700 hover:text-blue-700"
        >
          Browse Auctions
        </Link>
        <ConnectButton />
      </div>
    </header>
  );
}

function HeaderPathGate() {
  const pathname = usePathname();
  // Sembunyikan header di LP (karena tombol connect sudah besar di tengah)
  if (pathname === '/') return null;
  return <HeaderShell />;
}

export function Header() {
  return (
    <Suspense fallback={null}>
      <HeaderPathGate />
    </Suspense>
  );
}
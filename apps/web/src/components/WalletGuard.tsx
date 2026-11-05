// @file apps/web/src/components/WalletGuard.tsx
'use client';

import { useConnection } from 'wagmi';
import { useEffect, useState } from 'react';

export function WalletGuard({
  expectedWallet,
  children,
}: {
  expectedWallet: string;
  children: React.ReactNode;
}) {
  const { isConnected, address } = useConnection();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isValid =
    isConnected &&
    address &&
    address.toLowerCase() === expectedWallet.toLowerCase();

  if (!isValid) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-4xl font-bold mb-4 text-gray-300">404</h1>
        <p className="text-gray-600">
          Page not found. Please connect your wallet to access this dashboard.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
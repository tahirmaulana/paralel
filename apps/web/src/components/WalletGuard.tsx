// @file apps/web/src/components/WalletGuard.tsx
'use client';

import { useConnection } from 'wagmi';
import { useEffect, useState } from 'react';
import { ConnectButton } from './ConnectButton';

export function WalletGuard({
  expectedWallet,
  children,
}: {
  expectedWallet: string;
  children: React.ReactNode;
}) {
  const {
    isConnected,
    isConnecting,
    isReconnecting,
    address,
  } = useConnection();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isConnecting || isReconnecting) {
    return (
      <div className="p-8 text-center min-h-[50vh] flex items-center justify-center">
        <p className="text-gray-600">Restoring wallet connection…</p>
      </div>
    );
  }

  const isValid =
    isConnected &&
    address &&
    address.toLowerCase() === expectedWallet.toLowerCase();

  if (!isValid) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl font-bold mb-3">
          {!isConnected ? 'Reconnect your wallet' : 'Use the authorized wallet'}
        </h1>
        <p className="text-gray-600">
          {!isConnected
            ? 'Your role session is valid, but this browser wallet is disconnected.'
            : 'This dashboard is available only to its assigned wallet.'}
        </p>
        <div className="mt-5">
          <ConnectButton variant="landing" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
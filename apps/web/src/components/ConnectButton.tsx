// @file apps/web/src/components/ConnectButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { useConnection, useConnect, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';

export function ConnectButton({
  variant = 'header',
}: {
  variant?: 'header' | 'landing';
}) {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      router.push(`/dashboard?wallet=${address}`);
    }
  }, [isConnected, address, router]);

  if (!mounted) return null;

  // ── Connected State ──
  if (isConnected && address) {
    if (variant === 'landing') {
      return (
        <button
          onClick={() => router.push(`/dashboard?wallet=${address}`)}
          className="px-10 py-4 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-700 transition shadow-lg w-full"
        >
          Go to Dashboard
        </button>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono bg-gray-200 px-3 py-1.5 rounded-md text-gray-700">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => {
            disconnect();
            router.push('/'); // ← Redirect ke LP saat disconnect
          }}
          className="text-sm font-medium text-red-600 hover:text-red-700 transition"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // ── Disconnected State ──
  const injectedConnector = connectors[0];

  const handleConnect = () => {
    if (!injectedConnector) {
      alert('Wallet tidak terdeteksi. Silakan install MetaMask.');
      return;
    }
    connect({ connector: injectedConnector });
  };

  if (variant === 'landing') {
    return (
      <div className="flex flex-col items-center w-full">
        <button
          onClick={handleConnect}
          disabled={isPending}
          className="px-10 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 transition disabled:bg-gray-400 shadow-xl w-full"
        >
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {connectors.length === 0 && (
          <p className="text-xs text-red-500 font-bold mt-2">MetaMask tidak terdeteksi.</p>
        )}
        {error && <p className="text-xs text-red-500 mt-2 text-center">{error.message}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleConnect}
        disabled={isPending}
        className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
      >
        {isPending ? 'Menghubungkan...' : 'Connect Wallet'}
      </button>
      {connectors.length === 0 && (
        <p className="text-xs text-red-500 font-bold mt-1">MetaMask tidak terdeteksi.</p>
      )}
      {error && <p className="text-xs text-red-500 max-w-[200px] text-right bg-red-50 p-1 rounded">{error.message}</p>}
    </div>
  );
}
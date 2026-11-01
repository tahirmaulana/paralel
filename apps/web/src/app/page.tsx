// @file apps/web/src/app/page.tsx — Landing page to test wallet connection
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Pastikan komponen hanya dirender setelah berada di browser
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-black">
        <h1 className="text-4xl font-bold mb-8">Paralel Auction</h1>
        <p className="text-lg text-gray-600">Loading wallet...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-black">
      <h1 className="text-4xl font-bold mb-8">Paralel Auction</h1>
      
      {isConnected ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-medium text-green-600">Connected to {address}</p>
          <button 
            onClick={() => disconnect()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg text-gray-600">Connect your wallet to start bidding.</p>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Connect {connector.name}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
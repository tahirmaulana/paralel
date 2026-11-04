// @file apps/web/src/app/providers.tsx — Wagmi + React Query
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors'; // Cukup injected saja

const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL;

const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()], // Hanya satu konektor
  transports: {
    [arbitrumSepolia.id]: http(rpcUrl),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
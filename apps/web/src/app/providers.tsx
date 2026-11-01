// @file apps/web/src/app/providers.tsx — Wagmi and React Query providers for Web3 connection
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: http(),
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
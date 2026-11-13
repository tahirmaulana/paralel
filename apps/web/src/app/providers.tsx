// @file apps/web/src/app/providers.tsx — Wagmi + React Query
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fallback, http } from 'viem';
import { WagmiProvider, createConfig } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors'; // Cukup injected saja

const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL;
const rpcUrls = Array.from(
  new Set([
    rpcUrl?.trim(),
    ...arbitrumSepolia.rpcUrls.default.http,
  ].filter((url): url is string => Boolean(url))),
);

const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()], // Hanya satu konektor
  transports: {
    [arbitrumSepolia.id]: fallback(
      rpcUrls.map((url) =>
        http(url, {
          timeout: 15_000,
          retryCount: 1,
        }),
      ),
    ),
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
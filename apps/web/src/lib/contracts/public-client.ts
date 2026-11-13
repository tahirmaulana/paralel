import {
  createPublicClient,
  fallback,
  http,
  type PublicClient,
} from 'viem';

import {
  arbitrumSepolia,
} from 'viem/chains';

let cachedPublicClient:
  PublicClient | null = null;

function requireRpcUrl(): string {
  const rpcUrl =
    process.env
      .ARBITRUM_RPC_URL
      ?.trim();

  if (!rpcUrl) {
    throw new Error(
      'ARBITRUM_RPC_URL is missing.',
    );
  }

  const parsed =
    new URL(rpcUrl);

  if (
    parsed.protocol !== 'https:' &&
    parsed.protocol !== 'http:'
  ) {
    throw new Error(
      'ARBITRUM_RPC_URL must use HTTP or HTTPS.',
    );
  }

  return rpcUrl;
}

function createRpcTransport() {
  const rpcUrls = Array.from(
    new Set([
      requireRpcUrl(),
      ...arbitrumSepolia.rpcUrls.default.http,
    ]),
  );

  return fallback(
    rpcUrls.map((url) =>
      http(url, {
        timeout: 20_000,
        retryCount: 1,
        retryDelay: 500,
      }),
    ),
  );
}

export function getPublicClient():
  PublicClient {
  if (cachedPublicClient) {
    return cachedPublicClient;
  }

  cachedPublicClient =
    createPublicClient({
      chain:
        arbitrumSepolia,
      transport: createRpcTransport(),
    });

  return cachedPublicClient;
}

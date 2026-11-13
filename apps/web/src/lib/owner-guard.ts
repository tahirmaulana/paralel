// @file apps/web/src/lib/owner-guard.ts

/**
 * Server-side verification bahwa wallet sama dengan owner kontrak.
 *
 * ABI dan contract address berasal dari package canonical:
 * @paralel/contracts
 *
 * Catatan:
 * Fungsi ini hanya membandingkan address dengan owner on-chain.
 * Signed wallet session akan ditambahkan pada tahap authentication.
 */

import {
  createPublicClient,
  http,
  isAddress,
} from 'viem';
import { arbitrumSepolia } from 'viem/chains';

import {
  readContractOwner,
} from '@paralel/contracts';

function requireRpcUrl(): string {
  const rpcUrl =
    process.env.ARBITRUM_RPC_URL?.trim();

  if (!rpcUrl) {
    throw new Error(
      'ARBITRUM_RPC_URL is missing',
    );
  }

  return rpcUrl;
}

export async function verifyOwner(
  wallet: string,
): Promise<boolean> {
  if (!isAddress(wallet)) {
    return false;
  }

  try {
    const client = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(
        requireRpcUrl(),
        {
          timeout: 20_000,
          retryCount: 2,
          retryDelay: 1_000,
        },
      ),
    });

    const owner =
      await readContractOwner(client);

    return (
      owner.toLowerCase() ===
      wallet.toLowerCase()
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      '[owner-guard] verification failed:',
      message,
    );

    return false;
  }
}

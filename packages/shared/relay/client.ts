// @file packages/shared/relay/client.ts

import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  ParalelAuctionAbi,
  getParalelContractAddress,
  getParalelDeployment,
} from '@paralel/contracts';
import {
  createDomainError,
} from '@paralel/domain';

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw createDomainError(
      'RPC_UNAVAILABLE',
      name === 'ARBITRUM_RPC_URL'
        ? 'The Arbitrum Sepolia RPC is not configured. Contact the platform administrator.'
        : 'The on-chain relay is not configured correctly. Contact the platform administrator.',
    );
  }

  return value;
}

function requirePrivateKey(): Hex {
  const rawPrivateKey =
    process.env.RELAYER_PRIVATE_KEY?.trim();

  if (!rawPrivateKey) {
    throw createDomainError(
      'RPC_UNAVAILABLE',
      'RELAYER_PRIVATE_KEY is missing. Configure the web server with the relayer wallet private key as 64 hexadecimal characters, optionally prefixed with 0x.',
    );
  }

  const privateKey = rawPrivateKey.startsWith('0x')
    ? rawPrivateKey
    : `0x${rawPrivateKey}`;

  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw createDomainError(
      'RPC_UNAVAILABLE',
      'RELAYER_PRIVATE_KEY is malformed. Configure the web server with the relayer wallet private key as exactly 64 hexadecimal characters, optionally prefixed with 0x.',
    );
  }

  return privateKey as Hex;
}

function createCanonicalTransport() {
  const rpcUrls = Array.from(
    new Set([
      requireEnvironment('ARBITRUM_RPC_URL'),
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

export function getRelayPublicClient():
  PublicClient {
  return createPublicClient({
    chain: arbitrumSepolia,
    transport:
      createCanonicalTransport(),
  });
}

export function getRelayAccount() {
  return privateKeyToAccount(
    requirePrivateKey(),
  );
}

export async function assertRelayConfiguration(
  publicClient: PublicClient,
  contractAddress: `0x${string}` = getContractAddress(),
): Promise<void> {
  const account = getRelayAccount();
  const configuredRelayer =
    await publicClient.readContract({
      address: contractAddress,
      abi: ParalelAuctionAbi,
      functionName: 'relayerWallet',
    });

  if (
    configuredRelayer.toLowerCase() !==
    account.address.toLowerCase()
  ) {
    throw createDomainError(
      'RPC_UNAVAILABLE',
      'RELAYER_PRIVATE_KEY does not match the relayer wallet configured in the auction contract. Update the server secret to the matching key.',
    );
  }
}

export function getRelayClients(): {
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  const account =
    getRelayAccount();

  return {
    publicClient:
      getRelayPublicClient(),

    walletClient:
      createWalletClient({
        account,
        chain:
          arbitrumSepolia,
        transport:
          createCanonicalTransport(),
      }),
  };
}

/**
 * Compatibility function untuk API route lama.
 *
 * Contract address tidak lagi dibaca dari environment.
 * Sumber tunggalnya adalah packages/contracts.
 */
export function getContractAddress(): `0x${string}` {
  return getParalelContractAddress(
    ARBITRUM_SEPOLIA_CHAIN_ID,
  );
}

/**
 * Deployment canonical untuk Arbitrum Sepolia.
 */
export function getDeployment() {
  return getParalelDeployment(
    ARBITRUM_SEPOLIA_CHAIN_ID,
  );
}

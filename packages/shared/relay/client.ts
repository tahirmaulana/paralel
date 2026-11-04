// @file packages/shared/relay/client.ts
import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

export function getRelayClients(): {
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  const rpcUrl = process.env.ARBITRUM_RPC_URL;
  const rawPk = process.env.RELAYER_PRIVATE_KEY;
  if (!rpcUrl) throw new Error('ARBITRUM_RPC_URL is missing');
  if (!rawPk) throw new Error('RELAYER_PRIVATE_KEY is missing');

  const pk = rawPk.startsWith('0x') ? rawPk : `0x${rawPk}`;
  const account = privateKeyToAccount(pk as `0x${string}`);

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  return { publicClient, walletClient };
}

export function getContractAddress(): `0x${string}` {
  const addr = process.env.AUCTION_CONTRACT_ADDRESS;
  if (!addr) throw new Error('AUCTION_CONTRACT_ADDRESS is missing');
  return addr as `0x${string}`;
}